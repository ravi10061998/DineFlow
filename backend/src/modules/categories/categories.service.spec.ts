import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource, QueryFailedError } from "typeorm";
import { CategoriesService } from "./categories.service";
import { Category } from "./entities/category.entity";

describe("CategoriesService", () => {
  let service: CategoriesService;
  let categoriesRepo: { create: jest.Mock; save: jest.Mock; count: jest.Mock; findOne: jest.Mock; remove: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    categoriesRepo = {
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
      count: jest.fn().mockResolvedValue(0),
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    dataSource = { transaction: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: getRepositoryToken(Category), useValue: categoriesRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = moduleRef.get(CategoriesService);
  });

  describe("create", () => {
    it("assigns the next sort order when none is given", async () => {
      categoriesRepo.count.mockResolvedValue(3);

      const result = await service.create("r1", { name: "Starters" });

      expect(result.sortOrder).toBe(3);
    });

    it("maps a unique-constraint violation to CATEGORY_NAME_TAKEN", async () => {
      const dbError = Object.assign(new QueryFailedError("insert", [], new Error("duplicate")), { code: "23505" });
      categoriesRepo.save.mockRejectedValue(dbError);

      await expect(service.create("r1", { name: "Starters" })).rejects.toMatchObject({ code: "CATEGORY_NAME_TAKEN" });
    });

    it("lets an unrelated database error propagate unchanged", async () => {
      const otherError = new Error("connection lost");
      categoriesRepo.save.mockRejectedValue(otherError);

      await expect(service.create("r1", { name: "Starters" })).rejects.toBe(otherError);
    });
  });

  describe("reorder", () => {
    it("rejects a list that doesn't exactly match the restaurant's categories", async () => {
      dataSource.transaction.mockImplementation(async (cb: any) =>
        cb({ find: async () => [{ id: "a" }, { id: "b" }], update: jest.fn() }),
      );

      await expect(service.reorder("r1", ["a", "c"])).rejects.toMatchObject({ code: "REORDER_INVALID" });
    });

    it("assigns sort order by array index for a valid exact-match list", async () => {
      const updateCalls: any[] = [];
      dataSource.transaction.mockImplementation(async (cb: any) =>
        cb({
          find: async () => [{ id: "a" }, { id: "b" }, { id: "c" }],
          update: async (...args: any[]) => updateCalls.push(args),
        }),
      );

      await service.reorder("r1", ["c", "a", "b"]);

      expect(updateCalls).toContainEqual([Category, { id: "c", restaurantId: "r1" }, { sortOrder: 0 }]);
      expect(updateCalls).toContainEqual([Category, { id: "a", restaurantId: "r1" }, { sortOrder: 1 }]);
      expect(updateCalls).toContainEqual([Category, { id: "b", restaurantId: "r1" }, { sortOrder: 2 }]);
    });
  });

  describe("remove", () => {
    it("deletes a category with no products in it", async () => {
      const category = { id: "cat-1", restaurantId: "r1" };
      categoriesRepo.findOne.mockResolvedValue(category);

      await service.remove("cat-1", "r1");

      expect(categoriesRepo.remove).toHaveBeenCalledWith(category);
    });

    it("refuses to delete a category that still has products (future Module 7 guard)", async () => {
      categoriesRepo.findOne.mockResolvedValue({ id: "cat-1", restaurantId: "r1" });
      jest.spyOn(service as any, "countProductsInCategory").mockResolvedValue(2);

      await expect(service.remove("cat-1", "r1")).rejects.toMatchObject({ code: "CATEGORY_IN_USE" });
      expect(categoriesRepo.remove).not.toHaveBeenCalled();
    });
  });
});
