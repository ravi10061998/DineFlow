import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ReportsService } from "./reports.service";
import { Order, OrderStatus } from "../orders/entities/order.entity";
import { AnalyticsService } from "../analytics/analytics.service";

function makeQueryBuilder(getManyResult: unknown[]) {
  return {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(getManyResult),
  };
}

describe("ReportsService", () => {
  let service: ReportsService;
  let ordersRepo: { createQueryBuilder: jest.Mock };
  let analyticsService: { getAdminRevenueTimeSeries: jest.Mock; getRestaurantRevenueTimeSeries: jest.Mock };

  const baseOrder = {
    orderNumber: "ORD-1",
    createdAt: new Date("2026-08-01T10:00:00.000Z"),
    restaurant: { name: "Test Diner" },
    customer: { fullName: "Casey Customer", email: "casey@example.com" },
    subtotal: "200.00",
    deliveryFee: "30.00",
    discountAmount: "0.00",
    commissionAmount: "20.00",
    restaurantPayoutAmount: "180.00",
    totalAmount: "230.00",
    status: OrderStatus.DELIVERED,
    paymentStatus: "PAID",
  };

  beforeEach(async () => {
    ordersRepo = { createQueryBuilder: jest.fn().mockReturnValue(makeQueryBuilder([baseOrder])) };
    analyticsService = { getAdminRevenueTimeSeries: jest.fn().mockResolvedValue([]), getRestaurantRevenueTimeSeries: jest.fn().mockResolvedValue([]) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: getRepositoryToken(Order), useValue: ordersRepo },
        { provide: AnalyticsService, useValue: analyticsService },
      ],
    }).compile();

    service = moduleRef.get(ReportsService);
  });

  describe("generateOrdersCsv", () => {
    it("includes a Restaurant column for the platform-wide (admin) export", async () => {
      const csv = await service.generateOrdersCsv({});

      const [header, row] = csv.split("\r\n");
      expect(header).toContain("Restaurant");
      expect(row).toContain("Test Diner");
      expect(row).toContain("ORD-1");
      expect(row).toContain("Casey Customer");
    });

    it("omits the standalone Restaurant column when scoped to one restaurant (Restaurant Payout still legitimately appears)", async () => {
      const csv = await service.generateOrdersCsv({ restaurantId: "r1" });

      const [header] = csv.split("\r\n");
      expect(header.split(",")).not.toContain("Restaurant");
      expect(header).toContain("Restaurant Payout");
    });

    it("filters by restaurant_id when scoped", async () => {
      const qb = makeQueryBuilder([baseOrder]);
      ordersRepo.createQueryBuilder.mockReturnValue(qb);

      await service.generateOrdersCsv({ restaurantId: "r1" });

      expect(qb.andWhere).toHaveBeenCalledWith(expect.stringContaining("restaurant_id"), { restaurantId: "r1" });
    });

    it("filters by status when given", async () => {
      const qb = makeQueryBuilder([]);
      ordersRepo.createQueryBuilder.mockReturnValue(qb);

      await service.generateOrdersCsv({ status: OrderStatus.CANCELLED });

      expect(qb.andWhere).toHaveBeenCalledWith(expect.stringContaining("order.status"), { status: OrderStatus.CANCELLED });
    });

    it("quotes a customer name containing a comma, per RFC 4180", async () => {
      ordersRepo.createQueryBuilder.mockReturnValue(makeQueryBuilder([{ ...baseOrder, customer: { fullName: "Doe, Jane", email: "jane@example.com" } }]));

      const csv = await service.generateOrdersCsv({});

      expect(csv).toContain('"Doe, Jane"');
    });

    it("doubles an embedded quote character", async () => {
      ordersRepo.createQueryBuilder.mockReturnValue(makeQueryBuilder([{ ...baseOrder, customer: { fullName: 'Jane "JJ" Doe', email: "jane@example.com" } }]));

      const csv = await service.generateOrdersCsv({});

      expect(csv).toContain('"Jane ""JJ"" Doe"');
    });

    it("falls back to an empty string rather than crashing when a customer relation is missing", async () => {
      ordersRepo.createQueryBuilder.mockReturnValue(makeQueryBuilder([{ ...baseOrder, customer: null }]));

      const csv = await service.generateOrdersCsv({});

      expect(csv).toBeTruthy();
    });
  });

  describe("generateAdminRevenueCsv / generateRestaurantRevenueCsv", () => {
    it("reuses AnalyticsService's exact time series rather than re-deriving it", async () => {
      analyticsService.getAdminRevenueTimeSeries.mockResolvedValue([{ date: "2026-08-01", orderCount: 3, gmv: "900.00", commissionEarned: "90.00" }]);

      const csv = await service.generateAdminRevenueCsv("30d");

      expect(analyticsService.getAdminRevenueTimeSeries).toHaveBeenCalledWith("30d");
      expect(csv).toContain("2026-08-01");
      expect(csv).toContain("900.00");
    });

    it("scopes the restaurant revenue export to the given restaurant id", async () => {
      analyticsService.getRestaurantRevenueTimeSeries.mockResolvedValue([{ date: "2026-08-01", orderCount: 1, revenue: "200.00", payout: "180.00" }]);

      const csv = await service.generateRestaurantRevenueCsv("r1", "7d");

      expect(analyticsService.getRestaurantRevenueTimeSeries).toHaveBeenCalledWith("r1", "7d");
      expect(csv).toContain("180.00");
    });
  });
});
