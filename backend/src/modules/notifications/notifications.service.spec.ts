import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { Notification, NotificationType } from "./entities/notification.entity";
import { OrdersService } from "../orders/orders.service";
import { UsersService } from "../users/users.service";
import { NotificationDispatchService } from "../notification-gateway/notification-dispatch.service";
import { OrderStatusChangedEvent } from "../../common/events/order-status-changed.event";
import { PaymentSucceededEvent } from "../../common/events/payment-succeeded.event";
import { RefundSucceededEvent } from "../../common/events/refund-succeeded.event";

describe("NotificationsService", () => {
  let service: NotificationsService;
  let repo: { create: jest.Mock; save: jest.Mock; find: jest.Mock; findOne: jest.Mock };
  let ordersService: { findOneOrThrow: jest.Mock };
  let usersService: { findById: jest.Mock };
  let notificationDispatchService: { sendEmail: jest.Mock };

  beforeEach(async () => {
    repo = { create: jest.fn((x) => x), save: jest.fn(async (x) => x), find: jest.fn(), findOne: jest.fn() };
    ordersService = { findOneOrThrow: jest.fn().mockResolvedValue({ id: "o1", customerId: "u1", orderNumber: "ORD-1", totalAmount: "280.00" }) };
    usersService = { findById: jest.fn().mockResolvedValue({ id: "u1", email: "casey@example.com" }) };
    notificationDispatchService = { sendEmail: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(Notification), useValue: repo },
        { provide: OrdersService, useValue: ordersService },
        { provide: UsersService, useValue: usersService },
        { provide: NotificationDispatchService, useValue: notificationDispatchService },
      ],
    }).compile();

    service = moduleRef.get(NotificationsService);
  });

  it("creates an order-update notification for the order's customer, and dispatches a matching email", async () => {
    await service.handleOrderStatusChanged(new OrderStatusChangedEvent("o1", "PLACED" as never, "CONFIRMED" as never, "staff1"));

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", type: NotificationType.ORDER_UPDATE, relatedOrderId: "o1" }),
    );
    expect(notificationDispatchService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "casey@example.com" }),
      { relatedType: "ORDER_UPDATE", relatedId: "o1" },
    );
  });

  it("creates a notification + email when a payment succeeds", async () => {
    await service.handlePaymentSucceeded(new PaymentSucceededEvent("pay1", "o1"));

    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ userId: "u1", relatedOrderId: "o1" }));
    expect(notificationDispatchService.sendEmail).toHaveBeenCalledWith(expect.anything(), { relatedType: "PAYMENT_SUCCEEDED", relatedId: "o1" });
  });

  it("creates a notification + email when a refund succeeds", async () => {
    await service.handleRefundSucceeded(new RefundSucceededEvent("ref1", "o1"));

    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ userId: "u1", relatedOrderId: "o1" }));
    expect(notificationDispatchService.sendEmail).toHaveBeenCalledWith(expect.anything(), { relatedType: "REFUND_SUCCEEDED", relatedId: "o1" });
  });

  it("never lets a missing user block the in-app notification from being recorded", async () => {
    usersService.findById.mockRejectedValue(new Error("not found"));

    await service.handleOrderStatusChanged(new OrderStatusChangedEvent("o1", "PLACED" as never, "CONFIRMED" as never, "staff1"));

    expect(repo.save).toHaveBeenCalled();
    expect(notificationDispatchService.sendEmail).not.toHaveBeenCalled();
  });

  it("404s when marking a notification read that isn't owned by this user", async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(service.markRead("n1", "u1")).rejects.toBeInstanceOf(NotFoundException);
  });
});
