import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { Notification, NotificationType } from "./entities/notification.entity";
import { OrdersService } from "../orders/orders.service";
import { OrderStatusChangedEvent } from "../../common/events/order-status-changed.event";

describe("NotificationsService", () => {
  let service: NotificationsService;
  let repo: { create: jest.Mock; save: jest.Mock; find: jest.Mock; findOne: jest.Mock };
  let ordersService: { findOneOrThrow: jest.Mock };

  beforeEach(async () => {
    repo = { create: jest.fn((x) => x), save: jest.fn(async (x) => x), find: jest.fn(), findOne: jest.fn() };
    ordersService = { findOneOrThrow: jest.fn().mockResolvedValue({ id: "o1", customerId: "u1", orderNumber: "ORD-1" }) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(Notification), useValue: repo },
        { provide: OrdersService, useValue: ordersService },
      ],
    }).compile();

    service = moduleRef.get(NotificationsService);
  });

  it("creates an order-update notification for the order's customer", async () => {
    await service.handleOrderStatusChanged(new OrderStatusChangedEvent("o1", "PLACED" as never, "CONFIRMED" as never, "staff1"));

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", type: NotificationType.ORDER_UPDATE, relatedOrderId: "o1" }),
    );
  });

  it("404s when marking a notification read that isn't owned by this user", async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(service.markRead("n1", "u1")).rejects.toBeInstanceOf(NotFoundException);
  });
});
