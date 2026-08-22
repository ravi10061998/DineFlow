import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { DataSource } from "typeorm";
import { OrdersService } from "./orders.service";
import { Order, OrderStatus } from "./entities/order.entity";
import { OrderItem } from "./entities/order-item.entity";
import { OrderStatusHistory } from "./entities/order-status-history.entity";
import { CartService } from "../cart/cart.service";
import { AddressesService } from "../addresses/addresses.service";
import { CommissionService } from "../commission/commission.service";
import { RestaurantsService } from "../restaurants/restaurants.service";
import { DeliveryFeeService } from "../delivery-fee/delivery-fee.service";
import { CouponsService } from "../coupons/coupons.service";

describe("OrdersService", () => {
  let service: OrdersService;
  let ordersRepo: { find: jest.Mock; findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let cartService: { getCart: jest.Mock };
  let addressesService: { findOneOrThrow: jest.Mock };
  let commissionService: { calculateCommission: jest.Mock };
  let restaurantsService: { findByIdOrThrow: jest.Mock };
  let deliveryFeeService: { calculate: jest.Mock };
  let couponsService: { validateAndLock: jest.Mock; recordRedemption: jest.Mock; preview: jest.Mock };
  let dataSource: { transaction: jest.Mock };
  let eventEmitter: { emit: jest.Mock };

  const fullCart = {
    restaurantId: "r1",
    restaurantName: "Test Diner",
    subtotal: "340.00",
    items: [
      {
        id: "ci1",
        productId: "p1",
        productName: "Burger",
        variantId: "v1",
        variantName: "Large",
        variantPrice: "150.00",
        addons: [{ id: "ad1", name: "Cheese", price: "20.00" }],
        quantity: 2,
        unitPrice: "170.00",
        lineTotal: "340.00",
        isAvailable: true,
      },
    ],
  };

  const address = {
    id: "addr1",
    userId: "u1",
    receiverName: "Casey",
    receiverPhone: "+919999999999",
    addressLine1: "123 Main St",
    addressLine2: null,
    landmark: null,
    city: "Testville",
    state: "TS",
    postalCode: "123456",
    country: "IN",
    latitude: null,
    longitude: null,
  };

  beforeEach(async () => {
    ordersRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
    };
    cartService = { getCart: jest.fn().mockResolvedValue(fullCart) };
    addressesService = { findOneOrThrow: jest.fn().mockResolvedValue(address) };
    commissionService = { calculateCommission: jest.fn().mockResolvedValue({ amount: 340, platformAmount: 34, restaurantAmount: 306 }) };
    restaurantsService = { findByIdOrThrow: jest.fn().mockResolvedValue({ id: "r1", name: "Test Diner", latitude: null, longitude: null }) };
    deliveryFeeService = { calculate: jest.fn().mockResolvedValue({ fee: "20.00", distanceKm: null }) };
    couponsService = { validateAndLock: jest.fn(), recordRedemption: jest.fn().mockResolvedValue(undefined), preview: jest.fn() };
    dataSource = { transaction: jest.fn() };
    eventEmitter = { emit: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: ordersRepo },
        { provide: CartService, useValue: cartService },
        { provide: AddressesService, useValue: addressesService },
        { provide: CommissionService, useValue: commissionService },
        { provide: RestaurantsService, useValue: restaurantsService },
        { provide: DeliveryFeeService, useValue: deliveryFeeService },
        { provide: CouponsService, useValue: couponsService },
        { provide: DataSource, useValue: dataSource },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = moduleRef.get(OrdersService);
  });

  describe("checkout", () => {
    it("rejects an empty cart", async () => {
      cartService.getCart.mockResolvedValue({ restaurantId: null, restaurantName: null, items: [], subtotal: "0.00" });

      await expect(service.checkout("u1", "addr1")).rejects.toMatchObject({ code: "CART_EMPTY" });
    });

    it("rejects checkout when a cart item is unavailable", async () => {
      cartService.getCart.mockResolvedValue({ ...fullCart, items: [{ ...fullCart.items[0], isAvailable: false }] });

      await expect(service.checkout("u1", "addr1")).rejects.toMatchObject({ code: "CART_ITEMS_UNAVAILABLE" });
    });

    it("creates the order and items, snapshotting the commission split and delivery address", async () => {
      const savedEntities: any[] = [];
      ordersRepo.findOne.mockResolvedValue({ id: "order1", status: OrderStatus.PLACED, items: [] });
      dataSource.transaction.mockImplementation(async (cb: any) =>
        cb({
          create: (Entity: any, data: any) => ({ __entity: Entity, ...data }),
          save: async (x: any) => {
            if (Array.isArray(x)) savedEntities.push(...x);
            else savedEntities.push(x);
            return Array.isArray(x) ? x : { id: "order1", ...x };
          },
          delete: jest.fn(),
        }),
      );

      await service.checkout("u1", "addr1");

      const savedOrder = savedEntities.find((e) => e.__entity === Order);
      expect(savedOrder).toMatchObject({
        customerId: "u1",
        restaurantId: "r1",
        deliveryReceiverName: "Casey",
        subtotal: "340.00",
        commissionAmount: "34.00",
        restaurantPayoutAmount: "306.00",
        deliveryFee: "20.00",
        deliveryDistanceKm: null,
        deliveryLatitude: null,
        deliveryLongitude: null,
        totalAmount: "360.00",
        status: OrderStatus.PLACED,
      });

      const savedItem = savedEntities.find((e) => e.__entity === OrderItem);
      expect(savedItem).toMatchObject({ productName: "Burger", variantName: "Large", unitPrice: "170.00", quantity: 2, lineTotal: "340.00" });

      const savedHistory = savedEntities.find((e) => e.__entity === OrderStatusHistory);
      expect(savedHistory).toMatchObject({ fromStatus: null, toStatus: OrderStatus.PLACED, changedByUserId: "u1" });
    });

    it("folds a distance-based delivery fee into totalAmount without touching the restaurant's payout", async () => {
      deliveryFeeService.calculate.mockResolvedValue({ fee: "44.80", distanceKm: 3.1 });
      const savedEntities: any[] = [];
      ordersRepo.findOne.mockResolvedValue({ id: "order1", status: OrderStatus.PLACED, items: [] });
      dataSource.transaction.mockImplementation(async (cb: any) =>
        cb({
          create: (Entity: any, data: any) => ({ __entity: Entity, ...data }),
          save: async (x: any) => {
            if (Array.isArray(x)) savedEntities.push(...x);
            else savedEntities.push(x);
            return Array.isArray(x) ? x : { id: "order1", ...x };
          },
          delete: jest.fn(),
        }),
      );

      await service.checkout("u1", "addr1");

      const savedOrder = savedEntities.find((e) => e.__entity === Order);
      expect(savedOrder).toMatchObject({ deliveryFee: "44.80", deliveryDistanceKm: "3.1", totalAmount: "384.80", restaurantPayoutAmount: "306.00" });
    });

    it("applies a validated coupon's discount to totalAmount and records the redemption, without touching the restaurant's payout", async () => {
      couponsService.validateAndLock.mockResolvedValue({ coupon: { id: "coup1", code: "DINE50" }, discountAmount: "50.00" });
      const savedEntities: any[] = [];
      ordersRepo.findOne.mockResolvedValue({ id: "order1", status: OrderStatus.PLACED, items: [] });
      dataSource.transaction.mockImplementation(async (cb: any) =>
        cb({
          create: (Entity: any, data: any) => ({ __entity: Entity, ...data }),
          save: async (x: any) => {
            if (Array.isArray(x)) savedEntities.push(...x);
            else savedEntities.push(x);
            return Array.isArray(x) ? x : { id: "order1", ...x };
          },
          delete: jest.fn(),
        }),
      );

      await service.checkout("u1", "addr1", "dine50");

      expect(couponsService.validateAndLock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ code: "dine50", customerId: "u1", restaurantId: "r1", restaurantName: "Test Diner", subtotal: 340 }),
      );
      const savedOrder = savedEntities.find((e) => e.__entity === Order);
      expect(savedOrder).toMatchObject({ discountAmount: "50.00", couponCode: "DINE50", totalAmount: "310.00", restaurantPayoutAmount: "306.00" });
      expect(couponsService.recordRedemption).toHaveBeenCalledWith(expect.anything(), "coup1", "u1", "order1", "50.00");
    });

    it("propagates a coupon validation failure and never creates the order", async () => {
      couponsService.validateAndLock.mockRejectedValue(new Error("COUPON_EXPIRED"));
      dataSource.transaction.mockImplementation(async (cb: any) =>
        cb({ create: (Entity: any, data: any) => ({ __entity: Entity, ...data }), save: jest.fn(), delete: jest.fn() }),
      );

      await expect(service.checkout("u1", "addr1", "STALE")).rejects.toThrow("COUPON_EXPIRED");
    });
  });

  describe("cancelByCustomer", () => {
    it("allows cancelling a PLACED order", async () => {
      ordersRepo.findOne.mockResolvedValue({ id: "order1", customerId: "u1", status: OrderStatus.PLACED });
      dataSource.transaction.mockImplementation(async (cb: any) => cb({ save: jest.fn(), create: (Entity: any, data: any) => data }));

      await service.cancelByCustomer("order1", "u1", "changed my mind");

      expect(ordersRepo.findOne).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "order.status_changed",
        expect.objectContaining({ orderId: "order1", fromStatus: OrderStatus.PLACED, toStatus: OrderStatus.CANCELLED }),
      );
    });

    it("rejects cancelling an order that's already been confirmed", async () => {
      ordersRepo.findOne.mockResolvedValue({ id: "order1", customerId: "u1", status: OrderStatus.CONFIRMED });

      await expect(service.cancelByCustomer("order1", "u1", undefined)).rejects.toMatchObject({ code: "ORDER_CANNOT_BE_CANCELLED" });
    });
  });

  describe("updateStatusByRestaurant", () => {
    it("allows a valid forward transition", async () => {
      ordersRepo.findOne.mockResolvedValue({ id: "order1", restaurantId: "r1", status: OrderStatus.PLACED });
      dataSource.transaction.mockImplementation(async (cb: any) => cb({ save: jest.fn(), create: (Entity: any, data: any) => data }));

      await service.updateStatusByRestaurant("order1", "r1", OrderStatus.CONFIRMED, "staff1");

      expect(ordersRepo.findOne).toHaveBeenCalled();
    });

    it("rejects an invalid transition", async () => {
      ordersRepo.findOne.mockResolvedValue({ id: "order1", restaurantId: "r1", status: OrderStatus.PLACED });

      await expect(service.updateStatusByRestaurant("order1", "r1", OrderStatus.DELIVERED, "staff1")).rejects.toMatchObject({
        code: "INVALID_STATUS_TRANSITION",
      });
    });

    it("rejects a transition out of a terminal status", async () => {
      ordersRepo.findOne.mockResolvedValue({ id: "order1", restaurantId: "r1", status: OrderStatus.DELIVERED });

      await expect(service.updateStatusByRestaurant("order1", "r1", OrderStatus.CANCELLED, "staff1")).rejects.toMatchObject({
        code: "INVALID_STATUS_TRANSITION",
      });
    });
  });
});
