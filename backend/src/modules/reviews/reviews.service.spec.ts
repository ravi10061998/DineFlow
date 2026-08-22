import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { QueryFailedError } from "typeorm";
import { ReviewsService } from "./reviews.service";
import { Review } from "./entities/review.entity";
import { Order, OrderStatus } from "../orders/entities/order.entity";

function makeQueryBuilder(rawResult: unknown[], rawOneResult: unknown = null) {
  return {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rawResult),
    getRawOne: jest.fn().mockResolvedValue(rawOneResult),
  };
}

describe("ReviewsService", () => {
  let service: ReviewsService;
  let reviewsRepo: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; remove: jest.Mock; find: jest.Mock; createQueryBuilder: jest.Mock };
  let ordersRepo: { findOne: jest.Mock };

  beforeEach(async () => {
    reviewsRepo = {
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
      findOne: jest.fn(),
      remove: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn().mockReturnValue(makeQueryBuilder([])),
    };
    ordersRepo = { findOne: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: getRepositoryToken(Review), useValue: reviewsRepo },
        { provide: getRepositoryToken(Order), useValue: ordersRepo },
      ],
    }).compile();

    service = moduleRef.get(ReviewsService);
  });

  describe("createForOrder", () => {
    it("rejects when the order doesn't exist or isn't the customer's own", async () => {
      ordersRepo.findOne.mockResolvedValue(null);
      await expect(service.createForOrder("c1", { orderId: "o1", rating: 5 })).rejects.toThrow("Order not found");
    });

    it("rejects reviewing an order that hasn't been delivered yet", async () => {
      ordersRepo.findOne.mockResolvedValue({ id: "o1", customerId: "c1", restaurantId: "r1", status: OrderStatus.PLACED });
      await expect(service.createForOrder("c1", { orderId: "o1", rating: 5 })).rejects.toMatchObject({ code: "ORDER_NOT_DELIVERED" });
    });

    it("creates a review for a delivered order, snapshotting the restaurant id from the order", async () => {
      ordersRepo.findOne.mockResolvedValue({ id: "o1", customerId: "c1", restaurantId: "r1", status: OrderStatus.DELIVERED });

      const result = await service.createForOrder("c1", { orderId: "o1", rating: 4, comment: "Great food" });

      expect(result).toMatchObject({ orderId: "o1", customerId: "c1", restaurantId: "r1", rating: 4, comment: "Great food" });
    });

    it("maps a duplicate order_id to ORDER_ALREADY_REVIEWED", async () => {
      ordersRepo.findOne.mockResolvedValue({ id: "o1", customerId: "c1", restaurantId: "r1", status: OrderStatus.DELIVERED });
      const dbError = Object.assign(new QueryFailedError("insert", [], new Error("duplicate")), { code: "23505" });
      reviewsRepo.save.mockRejectedValue(dbError);

      await expect(service.createForOrder("c1", { orderId: "o1", rating: 5 })).rejects.toMatchObject({ code: "ORDER_ALREADY_REVIEWED" });
    });
  });

  describe("updateOwn", () => {
    it("rejects updating a review that isn't the customer's own", async () => {
      reviewsRepo.findOne.mockResolvedValue(null);
      await expect(service.updateOwn("c1", "rev1", { rating: 3 })).rejects.toThrow("Review not found");
    });

    it("updates rating and comment on the customer's own review", async () => {
      reviewsRepo.findOne.mockResolvedValue({ id: "rev1", customerId: "c1", rating: 2, comment: "meh" });
      const result = await service.updateOwn("c1", "rev1", { rating: 5, comment: "Actually great" });
      expect(result).toMatchObject({ rating: 5, comment: "Actually great" });
    });
  });

  describe("respondAsRestaurant", () => {
    it("rejects responding to a review that doesn't belong to this restaurant", async () => {
      reviewsRepo.findOne.mockResolvedValue(null);
      await expect(service.respondAsRestaurant("r1", "rev1", { response: "Thanks!" })).rejects.toThrow("Review not found");
    });

    it("sets the response and a timestamp, returning the customer's name (not their email/phone)", async () => {
      reviewsRepo.findOne.mockResolvedValue({
        id: "rev1",
        restaurantId: "r1",
        restaurantResponse: null,
        restaurantRespondedAt: null,
        customer: { id: "c1", fullName: "Casey Customer", email: "casey@test.local" },
      });
      const result = await service.respondAsRestaurant("r1", "rev1", { response: "Thanks for the feedback!" });
      expect(result.restaurantResponse).toBe("Thanks for the feedback!");
      expect(result.restaurantRespondedAt).toBeInstanceOf(Date);
      expect(result.customer).toEqual({ id: "c1", fullName: "Casey Customer" });
    });
  });

  describe("getSummaries", () => {
    it("returns an empty map without querying when given no ids", async () => {
      const result = await service.getSummaries([]);
      expect(result.size).toBe(0);
      expect(reviewsRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it("rounds the average to one decimal place per restaurant", async () => {
      reviewsRepo.createQueryBuilder.mockReturnValue(
        makeQueryBuilder([
          { restaurantId: "r1", avgRating: "4.3333333", reviewCount: "3" },
          { restaurantId: "r2", avgRating: "5.0000000", reviewCount: "1" },
        ]),
      );

      const result = await service.getSummaries(["r1", "r2", "r3"]);

      expect(result.get("r1")).toEqual({ avgRating: 4.3, reviewCount: 3 });
      expect(result.get("r2")).toEqual({ avgRating: 5, reviewCount: 1 });
      expect(result.get("r3")).toBeUndefined(); // no reviews at all -> not in the grouped result
    });

    it("getSummary falls back to null/0 for a restaurant with no reviews", async () => {
      const result = await service.getSummary("no-reviews-restaurant");
      expect(result).toEqual({ avgRating: null, reviewCount: 0 });
    });
  });

  describe("getPlatformSummary", () => {
    it("rounds the platform-wide average", async () => {
      reviewsRepo.createQueryBuilder.mockReturnValue(makeQueryBuilder([], { avgRating: "4.6666667", reviewCount: "3" }));

      const result = await service.getPlatformSummary();

      expect(result).toEqual({ avgRating: 4.7, reviewCount: 3 });
    });

    it("falls back to null/0 when there are no reviews at all", async () => {
      reviewsRepo.createQueryBuilder.mockReturnValue(makeQueryBuilder([], { avgRating: null, reviewCount: "0" }));

      const result = await service.getPlatformSummary();

      expect(result).toEqual({ avgRating: null, reviewCount: 0 });
    });
  });
});
