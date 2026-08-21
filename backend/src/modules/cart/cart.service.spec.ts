import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { NotFoundException } from "@nestjs/common";
import { CartService } from "./cart.service";
import { CartItem } from "./entities/cart-item.entity";
import { ProductsService } from "../products/products.service";
import { RestaurantsService } from "../restaurants/restaurants.service";

describe("CartService", () => {
  let service: CartService;
  let cartRepo: { create: jest.Mock; save: jest.Mock; find: jest.Mock; findOne: jest.Mock; remove: jest.Mock; delete: jest.Mock };
  let productsService: { findOneOrThrow: jest.Mock };
  let restaurantsService: { findByIdOrThrow: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  const product = {
    id: "p1",
    restaurantId: "r1",
    name: "Burger",
    basePrice: "100.00",
    isActive: true,
    isAvailable: true,
    variants: [{ id: "v1", name: "Large", price: "150.00", isActive: true }],
    addons: [{ id: "ad1", name: "Cheese", price: "20.00", isActive: true }],
  };

  beforeEach(async () => {
    cartRepo = {
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      remove: jest.fn(),
      delete: jest.fn(),
    };
    productsService = { findOneOrThrow: jest.fn().mockResolvedValue(product) };
    restaurantsService = { findByIdOrThrow: jest.fn().mockResolvedValue({ id: "r1", name: "Test Diner" }) };
    dataSource = { transaction: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: getRepositoryToken(CartItem), useValue: cartRepo },
        { provide: ProductsService, useValue: productsService },
        { provide: RestaurantsService, useValue: restaurantsService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = moduleRef.get(CartService);
  });

  describe("addItem", () => {
    it("adds a new line for a first item in an empty cart", async () => {
      cartRepo.find.mockResolvedValueOnce([]); // existingItems check inside addItem
      cartRepo.find.mockResolvedValueOnce([{ id: "ci1", userId: "u1", restaurantId: "r1", productId: "p1", variantId: null, addonIds: [], quantity: 1 }]); // getCart's own find

      const result = await service.addItem("u1", { productId: "p1" });

      expect(cartRepo.save).toHaveBeenCalled();
      expect(result.restaurantId).toBe("r1");
    });

    it("rejects an inactive product", async () => {
      productsService.findOneOrThrow.mockResolvedValue({ ...product, isActive: false });

      await expect(service.addItem("u1", { productId: "p1" })).rejects.toMatchObject({ code: "PRODUCT_UNAVAILABLE" });
    });

    it("rejects a variantId that doesn't belong to the product", async () => {
      await expect(service.addItem("u1", { productId: "p1", variantId: "not-real" })).rejects.toMatchObject({ code: "INVALID_VARIANT" });
    });

    it("rejects an addonId that doesn't belong to the product", async () => {
      await expect(service.addItem("u1", { productId: "p1", addonIds: ["not-real"] })).rejects.toMatchObject({ code: "INVALID_ADDON" });
    });

    it("merges into an existing matching line instead of duplicating it", async () => {
      const existing = { id: "ci1", userId: "u1", restaurantId: "r1", productId: "p1", variantId: null, addonIds: [], quantity: 2 };
      cartRepo.find.mockResolvedValueOnce([existing]); // existingItems check
      cartRepo.find.mockResolvedValueOnce([existing]); // getCart's find

      await service.addItem("u1", { productId: "p1", quantity: 3 });

      expect(cartRepo.save).toHaveBeenCalledWith(expect.objectContaining({ id: "ci1", quantity: 5 }));
      expect(cartRepo.create).not.toHaveBeenCalled();
    });

    it("rejects adding from a different restaurant without replaceCart", async () => {
      const existing = { id: "ci1", userId: "u1", restaurantId: "other-restaurant", productId: "px", variantId: null, addonIds: [], quantity: 1 };
      cartRepo.find.mockResolvedValueOnce([existing]);

      await expect(service.addItem("u1", { productId: "p1" })).rejects.toMatchObject({ code: "CART_DIFFERENT_RESTAURANT" });
      expect(cartRepo.save).not.toHaveBeenCalled();
    });

    it("clears the old cart and adds the new item when replaceCart is set", async () => {
      const existing = { id: "ci1", userId: "u1", restaurantId: "other-restaurant", productId: "px", variantId: null, addonIds: [], quantity: 1 };
      cartRepo.find.mockResolvedValueOnce([existing]); // existingItems check
      cartRepo.find.mockResolvedValueOnce([{ id: "ci2", userId: "u1", restaurantId: "r1", productId: "p1", variantId: null, addonIds: [], quantity: 1 }]); // getCart

      const deleteCalls: any[] = [];
      const saveCalls: any[] = [];
      dataSource.transaction.mockImplementation(async (cb: any) =>
        cb({
          delete: async (...args: any[]) => deleteCalls.push(args),
          create: (Entity: any, data: any) => data,
          save: async (x: any) => saveCalls.push(x),
        }),
      );

      const result = await service.addItem("u1", { productId: "p1", replaceCart: true });

      expect(deleteCalls).toContainEqual([CartItem, { userId: "u1" }]);
      expect(saveCalls).toContainEqual(expect.objectContaining({ productId: "p1" }));
      expect(result.restaurantId).toBe("r1");
    });
  });

  describe("updateQuantity", () => {
    it("404s when the cart item doesn't belong to this customer", async () => {
      cartRepo.findOne.mockResolvedValue(null);

      await expect(service.updateQuantity("ci1", "u1", 3)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("removeItem", () => {
    it("404s when the cart item doesn't belong to this customer", async () => {
      cartRepo.findOne.mockResolvedValue(null);

      await expect(service.removeItem("ci1", "u1")).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("getCart", () => {
    it("returns a zeroed-out view for an empty cart", async () => {
      cartRepo.find.mockResolvedValue([]);

      const result = await service.getCart("u1");

      expect(result).toEqual({ restaurantId: null, restaurantName: null, items: [], subtotal: "0.00" });
    });

    it("computes unit price and line total from variant + add-ons", async () => {
      cartRepo.find.mockResolvedValue([
        { id: "ci1", userId: "u1", restaurantId: "r1", productId: "p1", variantId: "v1", addonIds: ["ad1"], quantity: 2 },
      ]);

      const result = await service.getCart("u1");

      // variant 150 + addon 20 = 170/unit * 2 = 340
      expect(result.items[0].unitPrice).toBe("170.00");
      expect(result.items[0].lineTotal).toBe("340.00");
      expect(result.subtotal).toBe("340.00");
    });

    it("flags a line unavailable when its product no longer resolves", async () => {
      productsService.findOneOrThrow.mockRejectedValue(new NotFoundException());
      cartRepo.find.mockResolvedValue([
        { id: "ci1", userId: "u1", restaurantId: "r1", productId: "p1", variantId: null, addonIds: [], quantity: 1 },
      ]);

      const result = await service.getCart("u1");

      expect(result.items[0].isAvailable).toBe(false);
    });
  });
});
