import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DeliveryAssignmentsService } from "./delivery-assignments.service";
import { DeliveryAssignment, DeliveryAssignmentStatus } from "./entities/delivery-assignment.entity";
import { DeliveryPartner, DeliveryPartnerStatus } from "../delivery-partners/entities/delivery-partner.entity";
import { OrdersService } from "../orders/orders.service";
import { RestaurantsService } from "../restaurants/restaurants.service";
import { OrderStatus } from "../orders/entities/order.entity";
import { OrderStatusChangedEvent } from "../../common/events/order-status-changed.event";

describe("DeliveryAssignmentsService", () => {
  let service: DeliveryAssignmentsService;
  let assignmentsRepo: { find: jest.Mock; findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let partnersRepo: { find: jest.Mock; findOne: jest.Mock };
  let ordersService: { findOneOrThrow: jest.Mock };
  let restaurantsService: { findByIdOrThrow: jest.Mock };

  const order = { id: "o1", restaurantId: "r1" };
  const restaurant = { id: "r1", latitude: "12.9716", longitude: "77.5946" };

  beforeEach(async () => {
    assignmentsRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ ...x, id: x.id ?? "a1" })),
    };
    partnersRepo = { find: jest.fn().mockResolvedValue([]), findOne: jest.fn() };
    ordersService = { findOneOrThrow: jest.fn().mockResolvedValue(order) };
    restaurantsService = { findByIdOrThrow: jest.fn().mockResolvedValue(restaurant) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        DeliveryAssignmentsService,
        { provide: getRepositoryToken(DeliveryAssignment), useValue: assignmentsRepo },
        { provide: getRepositoryToken(DeliveryPartner), useValue: partnersRepo },
        { provide: OrdersService, useValue: ordersService },
        { provide: RestaurantsService, useValue: restaurantsService },
      ],
    }).compile();

    service = moduleRef.get(DeliveryAssignmentsService);
  });

  describe("tryAssign", () => {
    it("returns null when the restaurant has no coordinates", async () => {
      restaurantsService.findByIdOrThrow.mockResolvedValue({ ...restaurant, latitude: null, longitude: null });

      const result = await service.tryAssign("o1");

      expect(result).toBeNull();
      expect(assignmentsRepo.save).not.toHaveBeenCalled();
    });

    it("returns null when no partner is online with a shared location", async () => {
      partnersRepo.find.mockResolvedValue([]);

      const result = await service.tryAssign("o1");

      expect(result).toBeNull();
    });

    it("assigns the nearest eligible partner, excluding busy and previously-rejected ones", async () => {
      partnersRepo.find.mockResolvedValue([
        { id: "far", status: DeliveryPartnerStatus.APPROVED, isOnline: true, currentLatitude: "13.5", currentLongitude: "78.5" },
        { id: "near", status: DeliveryPartnerStatus.APPROVED, isOnline: true, currentLatitude: "12.98", currentLongitude: "77.60" },
        { id: "rejected-already", status: DeliveryPartnerStatus.APPROVED, isOnline: true, currentLatitude: "12.97", currentLongitude: "77.59" },
      ]);
      assignmentsRepo.find.mockImplementation(async ({ where }: any) => {
        if (where.status === DeliveryAssignmentStatus.REJECTED) return [{ deliveryPartnerId: "rejected-already" }];
        return []; // no busy partners
      });

      const result = await service.tryAssign("o1");

      expect(result).toMatchObject({ deliveryPartnerId: "near", status: DeliveryAssignmentStatus.ASSIGNED, orderId: "o1", restaurantId: "r1" });
      expect(result!.deliveryOtp).toMatch(/^\d{6}$/);
    });
  });

  describe("handleOrderStatusChanged", () => {
    it("only attempts assignment when the order becomes READY", async () => {
      const spy = jest.spyOn(service, "tryAssign");

      await service.handleOrderStatusChanged(new OrderStatusChangedEvent("o1", OrderStatus.PREPARING, OrderStatus.PLACED, "u1"));
      expect(spy).not.toHaveBeenCalled();

      await service.handleOrderStatusChanged(new OrderStatusChangedEvent("o1", OrderStatus.PREPARING, OrderStatus.READY, "u1"));
      expect(spy).toHaveBeenCalledWith("o1");
    });
  });

  describe("findForOrderWithDistance", () => {
    it("returns null when there's no assignment for the order", async () => {
      assignmentsRepo.findOne.mockResolvedValue(null);

      const result = await service.findForOrderWithDistance("o1", "12.9716", "77.5946");

      expect(result).toBeNull();
    });

    it("computes a real distance when both the order and the partner have coordinates", async () => {
      assignmentsRepo.findOne.mockResolvedValue({
        id: "a1",
        deliveryPartner: { currentLatitude: "13.00", currentLongitude: "77.60" },
      });

      const result = await service.findForOrderWithDistance("o1", "12.9716", "77.5946");

      expect(result!.distanceRemainingKm).toBeGreaterThan(0);
    });

    it("leaves distanceRemainingKm null when either side lacks coordinates", async () => {
      assignmentsRepo.findOne.mockResolvedValue({
        id: "a1",
        deliveryPartner: { currentLatitude: null, currentLongitude: null },
      });

      const result = await service.findForOrderWithDistance("o1", "12.9716", "77.5946");

      expect(result!.distanceRemainingKm).toBeNull();
    });
  });

  describe("ownership and transitions", () => {
    it("refuses an action on an assignment that belongs to a different partner", async () => {
      partnersRepo.findOne.mockResolvedValue({ id: "partner-a", userId: "u-a" });
      assignmentsRepo.findOne.mockResolvedValue({ id: "a1", deliveryPartnerId: "partner-b", status: DeliveryAssignmentStatus.ASSIGNED });

      await expect(service.accept("a1", "u-a")).rejects.toThrow("doesn't belong to you");
    });

    it("rejects an invalid transition", async () => {
      partnersRepo.findOne.mockResolvedValue({ id: "partner-a", userId: "u-a" });
      assignmentsRepo.findOne.mockResolvedValue({ id: "a1", deliveryPartnerId: "partner-a", status: DeliveryAssignmentStatus.DELIVERED });

      await expect(service.accept("a1", "u-a")).rejects.toMatchObject({ code: "INVALID_STATUS_TRANSITION" });
    });

    it("rejecting frees the partner and triggers a fresh assignment attempt for the same order", async () => {
      partnersRepo.findOne.mockResolvedValue({ id: "partner-a", userId: "u-a" });
      assignmentsRepo.findOne.mockResolvedValue({ id: "a1", orderId: "o1", deliveryPartnerId: "partner-a", status: DeliveryAssignmentStatus.ASSIGNED });
      const spy = jest.spyOn(service, "tryAssign").mockResolvedValue(null);

      await service.reject("a1", "u-a");

      expect(spy).toHaveBeenCalledWith("o1");
    });

    it("refuses to deliver with the wrong OTP", async () => {
      partnersRepo.findOne.mockResolvedValue({ id: "partner-a", userId: "u-a" });
      assignmentsRepo.findOne.mockResolvedValue({ id: "a1", deliveryPartnerId: "partner-a", status: DeliveryAssignmentStatus.PICKED_UP, deliveryOtp: "123456" });

      await expect(service.deliver("a1", "u-a", "000000")).rejects.toMatchObject({ code: "INVALID_DELIVERY_OTP" });
    });

    it("confirms delivery with the correct OTP", async () => {
      partnersRepo.findOne.mockResolvedValue({ id: "partner-a", userId: "u-a" });
      assignmentsRepo.findOne.mockResolvedValue({ id: "a1", deliveryPartnerId: "partner-a", status: DeliveryAssignmentStatus.PICKED_UP, deliveryOtp: "123456" });

      const result = await service.deliver("a1", "u-a", "123456");

      expect(result.status).toBe(DeliveryAssignmentStatus.DELIVERED);
      expect(result.deliveredAt).toBeInstanceOf(Date);
    });
  });
});
