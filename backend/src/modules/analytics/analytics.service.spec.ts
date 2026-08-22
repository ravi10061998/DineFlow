import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { AnalyticsService } from "./analytics.service";
import { Order } from "../orders/entities/order.entity";
import { OrderItem } from "../orders/entities/order-item.entity";
import { ReviewsService } from "../reviews/reviews.service";

function makeQueryBuilder(rawOneResult: unknown = null, rawManyResult: unknown[] = []) {
  const qb: any = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue(rawOneResult),
    getRawMany: jest.fn().mockResolvedValue(rawManyResult),
  };
  return qb;
}

describe("AnalyticsService", () => {
  let service: AnalyticsService;
  let ordersRepo: { createQueryBuilder: jest.Mock };
  let orderItemsRepo: { createQueryBuilder: jest.Mock };
  let reviewsService: { getSummary: jest.Mock; getPlatformSummary: jest.Mock };

  beforeEach(async () => {
    ordersRepo = { createQueryBuilder: jest.fn().mockReturnValue(makeQueryBuilder()) };
    orderItemsRepo = { createQueryBuilder: jest.fn().mockReturnValue(makeQueryBuilder()) };
    reviewsService = {
      getSummary: jest.fn().mockResolvedValue({ avgRating: 4.5, reviewCount: 2 }),
      getPlatformSummary: jest.fn().mockResolvedValue({ avgRating: 4.2, reviewCount: 10 }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: getRepositoryToken(Order), useValue: ordersRepo },
        { provide: getRepositoryToken(OrderItem), useValue: orderItemsRepo },
        { provide: ReviewsService, useValue: reviewsService },
      ],
    }).compile();

    service = moduleRef.get(AnalyticsService);
  });

  describe("getAdminOverview", () => {
    it("computes avgOrderValue and pulls the platform rating in", async () => {
      ordersRepo.createQueryBuilder.mockReturnValue(
        makeQueryBuilder({ totalOrders: "4", gmv: "1000.00", commissionEarned: "100.00", totalDiscountGiven: "50.00", activeCustomers: "3" }),
      );

      const result = await service.getAdminOverview("30d");

      expect(result).toMatchObject({
        period: "30d",
        totalOrders: 4,
        gmv: "1000.00",
        commissionEarned: "100.00",
        totalDiscountGiven: "50.00",
        avgOrderValue: "250.00",
        activeCustomers: 3,
        platformAvgRating: 4.2,
        platformReviewCount: 10,
      });
    });

    it("returns zeroes rather than NaN when there are no orders at all", async () => {
      ordersRepo.createQueryBuilder.mockReturnValue(
        makeQueryBuilder({ totalOrders: "0", gmv: "0", commissionEarned: "0", totalDiscountGiven: "0", activeCustomers: "0" }),
      );

      const result = await service.getAdminOverview();

      expect(result.avgOrderValue).toBe("0.00");
      expect(result.totalOrders).toBe(0);
    });

    it("falls back to a 30-day window for an unrecognized period value", async () => {
      const qb = makeQueryBuilder({ totalOrders: "0", gmv: "0", commissionEarned: "0", totalDiscountGiven: "0", activeCustomers: "0" });
      ordersRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getAdminOverview("nonsense");

      expect(result.period).toBe("30d");
      expect(qb.andWhere).toHaveBeenCalledWith(expect.stringContaining("created_at"), expect.anything());
    });

    it("does not filter by date at all for period=all", async () => {
      const qb = makeQueryBuilder({ totalOrders: "0", gmv: "0", commissionEarned: "0", totalDiscountGiven: "0", activeCustomers: "0" });
      ordersRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getAdminOverview("all");

      expect(qb.andWhere).not.toHaveBeenCalled();
    });
  });

  describe("getAdminRevenueTimeSeries", () => {
    it("maps each bucketed row to a numeric orderCount and formatted money strings", async () => {
      ordersRepo.createQueryBuilder.mockReturnValue(
        makeQueryBuilder(null, [{ date: "2026-08-01", orderCount: "2", gmv: "500", commissionEarned: "50" }]),
      );

      const result = await service.getAdminRevenueTimeSeries("7d");

      expect(result).toEqual([{ date: "2026-08-01", orderCount: 2, gmv: "500.00", commissionEarned: "50.00" }]);
    });
  });

  describe("getTopRestaurants", () => {
    it("maps ranked rows and always excludes cancelled orders", async () => {
      const qb = makeQueryBuilder(null, [{ restaurantId: "r1", restaurantName: "Test Diner", orderCount: "5", gmv: "900.00" }]);
      ordersRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getTopRestaurants();

      expect(result).toEqual([{ restaurantId: "r1", restaurantName: "Test Diner", orderCount: 5, gmv: "900.00" }]);
      expect(qb.where).toHaveBeenCalledWith(expect.stringContaining("status"), expect.objectContaining({ cancelled: "CANCELLED" }));
    });
  });

  describe("getTopProducts / getRestaurantTopProducts", () => {
    it("groups by product name (stable even when the product row was later deleted)", async () => {
      orderItemsRepo.createQueryBuilder.mockReturnValue(makeQueryBuilder(null, [{ productName: "Biryani", unitsSold: "12", revenue: "2400.00" }]));

      const result = await service.getTopProducts();

      expect(result).toEqual([{ productName: "Biryani", unitsSold: 12, revenue: "2400.00" }]);
    });

    it("scopes to one restaurant when an id is given", async () => {
      const qb = makeQueryBuilder(null, []);
      orderItemsRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getRestaurantTopProducts("r1");

      expect(qb.andWhere).toHaveBeenCalledWith(expect.stringContaining("restaurant_id"), { restaurantId: "r1" });
    });
  });

  describe("getRestaurantOverview", () => {
    it("computes revenue/payout/avgOrderValue scoped to one restaurant, plus its own rating", async () => {
      ordersRepo.createQueryBuilder.mockReturnValue(makeQueryBuilder({ totalOrders: "2", revenue: "400.00", payout: "360.00" }));

      const result = await service.getRestaurantOverview("r1", "90d");

      expect(result).toMatchObject({ totalOrders: 2, revenue: "400.00", payout: "360.00", avgOrderValue: "200.00", avgRating: 4.5, reviewCount: 2 });
      expect(reviewsService.getSummary).toHaveBeenCalledWith("r1");
    });
  });
});
