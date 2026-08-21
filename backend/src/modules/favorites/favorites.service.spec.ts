import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException } from "@nestjs/common";
import { QueryFailedError } from "typeorm";
import { FavoritesService } from "./favorites.service";
import { Favorite, FavoriteTargetType } from "./entities/favorite.entity";
import { RestaurantsService } from "../restaurants/restaurants.service";
import { ProductsService } from "../products/products.service";

describe("FavoritesService", () => {
  let service: FavoritesService;
  let repo: { create: jest.Mock; save: jest.Mock; find: jest.Mock; findOne: jest.Mock; remove: jest.Mock };
  let restaurantsService: { findByIdOrThrow: jest.Mock };
  let productsService: { findOneOrThrow: jest.Mock };

  const restaurant = { id: "r1", name: "Test Diner", slug: "test-diner", city: "Testville" };

  beforeEach(async () => {
    repo = { create: jest.fn((x) => x), save: jest.fn(async (x) => x), find: jest.fn(), findOne: jest.fn(), remove: jest.fn() };
    restaurantsService = { findByIdOrThrow: jest.fn().mockResolvedValue(restaurant) };
    productsService = { findOneOrThrow: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        FavoritesService,
        { provide: getRepositoryToken(Favorite), useValue: repo },
        { provide: RestaurantsService, useValue: restaurantsService },
        { provide: ProductsService, useValue: productsService },
      ],
    }).compile();

    service = moduleRef.get(FavoritesService);
  });

  it("rejects favoriting a restaurant that doesn't exist", async () => {
    restaurantsService.findByIdOrThrow.mockRejectedValue(new NotFoundException());

    await expect(service.add("u1", { targetType: FavoriteTargetType.RESTAURANT, targetId: "missing" })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("adds a valid restaurant favorite", async () => {
    const result = await service.add("u1", { targetType: FavoriteTargetType.RESTAURANT, targetId: "r1" });

    expect(result.restaurant).toEqual(restaurant);
  });

  it("treats re-favoriting the same target as idempotent, not an error", async () => {
    const dbError = Object.assign(new QueryFailedError("insert", [], new Error("duplicate")), { code: "23505" });
    repo.save.mockRejectedValue(dbError);
    repo.findOne.mockResolvedValue({ id: "f1", userId: "u1", targetType: FavoriteTargetType.RESTAURANT, targetId: "r1" });

    const result = await service.add("u1", { targetType: FavoriteTargetType.RESTAURANT, targetId: "r1" });

    expect(result.id).toBe("f1");
  });

  it("404s when removing a favorite that isn't owned by this user", async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(service.remove("f1", "u1")).rejects.toBeInstanceOf(NotFoundException);
  });
});
