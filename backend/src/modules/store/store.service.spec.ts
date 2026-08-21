import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { StoreService } from "./store.service";
import { Restaurant, RestaurantStatus } from "../restaurants/entities/restaurant.entity";
import { Product } from "../products/entities/product.entity";
import { Order } from "../orders/entities/order.entity";
import { OrderItem } from "../orders/entities/order-item.entity";
import { BannersService } from "../banners/banners.service";
import { FoodCategoriesService } from "../food-categories/food-categories.service";
import { OffersService } from "../offers/offers.service";
import { BlogsService } from "../blogs/blogs.service";

function makeQueryBuilder(rawResult: unknown[]) {
  const qb: any = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rawResult),
    getMany: jest.fn().mockResolvedValue([]),
  };
  return qb;
}

describe("StoreService", () => {
  let service: StoreService;
  let restaurantsRepo: { find: jest.Mock; createQueryBuilder: jest.Mock };
  let productsRepo: { find: jest.Mock; createQueryBuilder: jest.Mock };
  let ordersRepo: { createQueryBuilder: jest.Mock };
  let orderItemsRepo: { createQueryBuilder: jest.Mock };

  beforeEach(async () => {
    restaurantsRepo = { find: jest.fn().mockResolvedValue([]), createQueryBuilder: jest.fn() };
    productsRepo = { find: jest.fn().mockResolvedValue([]), createQueryBuilder: jest.fn() };
    ordersRepo = { createQueryBuilder: jest.fn().mockReturnValue(makeQueryBuilder([])) };
    orderItemsRepo = { createQueryBuilder: jest.fn().mockReturnValue(makeQueryBuilder([])) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        StoreService,
        { provide: getRepositoryToken(Restaurant), useValue: restaurantsRepo },
        { provide: getRepositoryToken(Product), useValue: productsRepo },
        { provide: getRepositoryToken(Order), useValue: ordersRepo },
        { provide: getRepositoryToken(OrderItem), useValue: orderItemsRepo },
        { provide: BannersService, useValue: { findActiveForStore: jest.fn() } },
        { provide: FoodCategoriesService, useValue: { findActiveForStore: jest.fn() } },
        { provide: OffersService, useValue: { findActiveForStore: jest.fn() } },
        { provide: BlogsService, useValue: { findPublished: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(StoreService);
  });

  describe("getNearbyRestaurants", () => {
    it("only includes restaurants within their own delivery radius, sorted by distance", async () => {
      restaurantsRepo.find.mockResolvedValue([
        // ~1.1km away, radius 5km -> included
        { id: "close", status: RestaurantStatus.APPROVED, latitude: "12.9720", longitude: "77.5950", deliveryRadiusKm: "5", name: "Close" },
        // ~111km away (1 degree lat), radius 5km -> excluded
        { id: "far", status: RestaurantStatus.APPROVED, latitude: "13.9716", longitude: "77.5946", deliveryRadiusKm: "5", name: "Far" },
      ]);

      const result = await service.getNearbyRestaurants(12.9716, 77.5946);

      expect(result.map((r) => r.id)).toEqual(["close"]);
      expect(result[0].distanceKm).toBeGreaterThan(0);
      expect(result[0].distanceKm).toBeLessThan(5);
    });

    it("excludes restaurants without coordinates", async () => {
      restaurantsRepo.find.mockResolvedValue([
        { id: "no-coords", status: RestaurantStatus.APPROVED, latitude: null, longitude: null, deliveryRadiusKm: "5" },
      ]);

      const result = await service.getNearbyRestaurants(12.9716, 77.5946);

      expect(result).toHaveLength(0);
    });
  });

  describe("getRecommendedRestaurants", () => {
    it("falls back to popular restaurants when the customer has no order history", async () => {
      ordersRepo.createQueryBuilder
        .mockReturnValueOnce(makeQueryBuilder([])) // this customer's own order history — empty
        .mockReturnValueOnce(makeQueryBuilder([{ restaurantId: "r1", orderCount: "5" }])); // fallback popular query
      restaurantsRepo.find.mockResolvedValue([{ id: "r1", status: RestaurantStatus.APPROVED, name: "Popular Diner" }]);

      const result = await service.getRecommendedRestaurants("u1");

      expect(result.map((r) => r.id)).toEqual(["r1"]);
    });

    it("uses the customer's own order history when it exists, without falling back", async () => {
      ordersRepo.createQueryBuilder.mockReturnValueOnce(makeQueryBuilder([{ restaurantId: "r2", orderCount: "3" }]));
      restaurantsRepo.find.mockResolvedValue([{ id: "r2", status: RestaurantStatus.APPROVED, name: "My Usual" }]);

      const result = await service.getRecommendedRestaurants("u1");

      expect(result.map((r) => r.id)).toEqual(["r2"]);
      expect(ordersRepo.createQueryBuilder).toHaveBeenCalledTimes(1);
    });
  });

  describe("getRecentlyOrdered / rankProducts empty-results guard", () => {
    it("returns an empty array without querying products when there are no order items", async () => {
      const result = await service.getRecentlyOrdered("u1");

      expect(result).toEqual([]);
      expect(productsRepo.find).not.toHaveBeenCalled();
    });

    it("returns an empty array for popular products when there are no order items", async () => {
      const result = await service.getPopularProducts();

      expect(result).toEqual([]);
      expect(productsRepo.find).not.toHaveBeenCalled();
    });
  });
});
