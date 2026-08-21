import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { NotFoundException } from "@nestjs/common";
import { ProductsService } from "./products.service";
import { Product } from "./entities/product.entity";
import { ProductVariant } from "./entities/product-variant.entity";
import { ProductAddon } from "./entities/product-addon.entity";
import { CategoriesService } from "../categories/categories.service";

describe("ProductsService", () => {
  let service: ProductsService;
  let productsRepo: { create: jest.Mock; save: jest.Mock; count: jest.Mock; findOne: jest.Mock; remove: jest.Mock; find: jest.Mock };
  let variantsRepo: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; remove: jest.Mock };
  let addonsRepo: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; remove: jest.Mock };
  let dataSource: { transaction: jest.Mock };
  let categoriesService: { findOneOrThrow: jest.Mock };

  beforeEach(async () => {
    productsRepo = {
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
      count: jest.fn().mockResolvedValue(0),
      findOne: jest.fn(),
      remove: jest.fn(),
      find: jest.fn(),
    };
    variantsRepo = {
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    addonsRepo = {
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    dataSource = { transaction: jest.fn() };
    categoriesService = { findOneOrThrow: jest.fn().mockResolvedValue({ id: "cat-1", restaurantId: "r1" }) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(Product), useValue: productsRepo },
        { provide: getRepositoryToken(ProductVariant), useValue: variantsRepo },
        { provide: getRepositoryToken(ProductAddon), useValue: addonsRepo },
        { provide: CategoriesService, useValue: categoriesService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = moduleRef.get(ProductsService);
  });

  describe("countInCategory", () => {
    it("counts products scoped to a category", async () => {
      productsRepo.count.mockResolvedValue(4);

      await expect(service.countInCategory("cat-1")).resolves.toBe(4);
      expect(productsRepo.count).toHaveBeenCalledWith({ where: { categoryId: "cat-1" } });
    });
  });

  describe("create", () => {
    it("validates the category belongs to the same restaurant before creating", async () => {
      productsRepo.count.mockResolvedValue(2);

      const result = await service.create("r1", { categoryId: "cat-1", name: "Burger", basePrice: 199 });

      expect(categoriesService.findOneOrThrow).toHaveBeenCalledWith("cat-1", "r1");
      expect(result.sortOrder).toBe(2);
      expect(result.basePrice).toBe("199");
    });

    it("propagates the category-not-found error for a cross-tenant categoryId", async () => {
      categoriesService.findOneOrThrow.mockRejectedValue(new NotFoundException("Category not found"));

      await expect(service.create("r1", { categoryId: "other-tenant-cat", name: "Burger", basePrice: 199 })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(productsRepo.save).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("re-validates the category only when categoryId is being changed", async () => {
      productsRepo.findOne.mockResolvedValue({ id: "p1", restaurantId: "r1", categoryId: "cat-1", basePrice: "199" });

      await service.update("p1", "r1", { name: "Cheeseburger" });

      expect(categoriesService.findOneOrThrow).not.toHaveBeenCalled();
    });

    it("validates the new category when categoryId changes", async () => {
      productsRepo.findOne.mockResolvedValue({ id: "p1", restaurantId: "r1", categoryId: "cat-1", basePrice: "199" });

      await service.update("p1", "r1", { categoryId: "cat-2" });

      expect(categoriesService.findOneOrThrow).toHaveBeenCalledWith("cat-2", "r1");
    });
  });

  describe("reorder", () => {
    it("rejects a list that doesn't exactly match the category's products", async () => {
      dataSource.transaction.mockImplementation(async (cb: any) => cb({ find: async () => [{ id: "a" }, { id: "b" }], update: jest.fn() }));

      await expect(service.reorder("r1", "cat-1", ["a", "c"])).rejects.toMatchObject({ code: "REORDER_INVALID" });
    });

    it("assigns sort order by array index for a valid exact-match list", async () => {
      const updateCalls: any[] = [];
      dataSource.transaction.mockImplementation(async (cb: any) =>
        cb({
          find: async () => [{ id: "a" }, { id: "b" }, { id: "c" }],
          update: async (...args: any[]) => updateCalls.push(args),
        }),
      );

      await service.reorder("r1", "cat-1", ["c", "a", "b"]);

      expect(updateCalls).toContainEqual([Product, { id: "c", restaurantId: "r1" }, { sortOrder: 0 }]);
      expect(updateCalls).toContainEqual([Product, { id: "a", restaurantId: "r1" }, { sortOrder: 1 }]);
      expect(updateCalls).toContainEqual([Product, { id: "b", restaurantId: "r1" }, { sortOrder: 2 }]);
    });
  });

  describe("variants", () => {
    it("adds a variant to an existing product", async () => {
      productsRepo.findOne.mockResolvedValue({ id: "p1", restaurantId: "r1" });

      const variant = await service.addVariant("p1", "r1", { name: "Large", price: 50 });

      expect(variant.price).toBe("50");
    });

    it("throws when removing a variant that doesn't belong to the product", async () => {
      productsRepo.findOne.mockResolvedValue({ id: "p1", restaurantId: "r1" });
      variantsRepo.findOne.mockResolvedValue(null);

      await expect(service.removeVariant("p1", "missing-variant", "r1")).rejects.toBeInstanceOf(NotFoundException);
      expect(variantsRepo.remove).not.toHaveBeenCalled();
    });
  });

  describe("addons", () => {
    it("adds an add-on to an existing product", async () => {
      productsRepo.findOne.mockResolvedValue({ id: "p1", restaurantId: "r1" });

      const addon = await service.addAddon("p1", "r1", { name: "Extra Cheese", price: 20 });

      expect(addon.price).toBe("20");
    });

    it("throws when updating an add-on that doesn't belong to the product", async () => {
      productsRepo.findOne.mockResolvedValue({ id: "p1", restaurantId: "r1" });
      addonsRepo.findOne.mockResolvedValue(null);

      await expect(service.updateAddon("p1", "missing-addon", "r1", { name: "X" })).rejects.toBeInstanceOf(NotFoundException);
      expect(addonsRepo.save).not.toHaveBeenCalled();
    });
  });
});
