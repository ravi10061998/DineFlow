import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { QueryFailedError } from "typeorm";
import { FoodCategoriesService } from "./food-categories.service";
import { FoodCategory } from "./entities/food-category.entity";

describe("FoodCategoriesService", () => {
  let service: FoodCategoriesService;
  let repo: { create: jest.Mock; save: jest.Mock; count: jest.Mock; findOne: jest.Mock; remove: jest.Mock; find: jest.Mock };

  beforeEach(async () => {
    repo = {
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
      count: jest.fn().mockResolvedValue(0),
      findOne: jest.fn(),
      remove: jest.fn(),
      find: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [FoodCategoriesService, { provide: getRepositoryToken(FoodCategory), useValue: repo }],
    }).compile();

    service = moduleRef.get(FoodCategoriesService);
  });

  it("assigns the next sort order when none is given", async () => {
    repo.count.mockResolvedValue(3);

    const result = await service.create({ name: "Pizza", slug: "pizza" });

    expect(result.sortOrder).toBe(3);
  });

  it("maps a duplicate slug to FOOD_CATEGORY_SLUG_TAKEN", async () => {
    const dbError = Object.assign(new QueryFailedError("insert", [], new Error("duplicate")), { code: "23505" });
    repo.save.mockRejectedValue(dbError);

    await expect(service.create({ name: "Pizza", slug: "pizza" })).rejects.toMatchObject({ code: "FOOD_CATEGORY_SLUG_TAKEN" });
  });

  it("only returns active categories for the storefront", async () => {
    await service.findActiveForStore();

    expect(repo.find).toHaveBeenCalledWith({ where: { isActive: true }, order: { sortOrder: "ASC" } });
  });
});
