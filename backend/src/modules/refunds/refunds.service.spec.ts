import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { RefundsService } from "./refunds.service";
import { Refund, RefundStatus } from "./entities/refund.entity";
import { Order, OrderPaymentStatus, OrderStatus } from "../orders/entities/order.entity";
import { OrdersService } from "../orders/orders.service";
import { PaymentsService } from "../payments/payments.service";
import { PAYMENT_GATEWAY } from "../payments/gateways/payment-gateway.interface";
import { ORDER_STATUS_CHANGED_EVENT, OrderStatusChangedEvent } from "../../common/events/order-status-changed.event";

describe("RefundsService", () => {
  let service: RefundsService;
  let refundsRepo: { create: jest.Mock; save: jest.Mock; find: jest.Mock };
  let ordersService: { findOneOrThrow: jest.Mock };
  let paymentsService: { findSucceededPaymentForOrder: jest.Mock };
  let gateway: { name: string; refund: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  const order = { id: "o1", totalAmount: "279.00", paymentStatus: OrderPaymentStatus.PAID };
  const payment = { id: "p1", orderId: "o1", gatewayPaymentId: "pay_1" };

  beforeEach(async () => {
    refundsRepo = { create: jest.fn((x) => x), save: jest.fn(async (x) => x), find: jest.fn() };
    ordersService = { findOneOrThrow: jest.fn().mockResolvedValue(order) };
    paymentsService = { findSucceededPaymentForOrder: jest.fn().mockResolvedValue(payment) };
    gateway = { name: "MOCK", refund: jest.fn().mockResolvedValue({ gatewayRefundId: "mock_refund_1" }) };
    dataSource = { transaction: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        RefundsService,
        { provide: getRepositoryToken(Refund), useValue: refundsRepo },
        { provide: OrdersService, useValue: ordersService },
        { provide: PaymentsService, useValue: paymentsService },
        { provide: PAYMENT_GATEWAY, useValue: gateway },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = moduleRef.get(RefundsService);
  });

  describe("handleOrderStatusChanged", () => {
    it("ignores transitions that aren't a cancellation", async () => {
      const spy = jest.spyOn(service, "initiateForOrder");

      await service.handleOrderStatusChanged(new OrderStatusChangedEvent("o1", OrderStatus.PLACED, OrderStatus.CONFIRMED, "u1"));

      expect(spy).not.toHaveBeenCalled();
    });

    it("ignores a cancellation when the order was never paid", async () => {
      ordersService.findOneOrThrow.mockResolvedValue({ ...order, paymentStatus: OrderPaymentStatus.PENDING });
      const spy = jest.spyOn(service, "initiateForOrder");

      await service.handleOrderStatusChanged(new OrderStatusChangedEvent("o1", OrderStatus.PLACED, OrderStatus.CANCELLED, "u1"));

      expect(spy).not.toHaveBeenCalled();
    });

    it("initiates a refund when a PAID order is cancelled", async () => {
      const spy = jest.spyOn(service, "initiateForOrder").mockResolvedValue({} as Refund);

      await service.handleOrderStatusChanged(new OrderStatusChangedEvent("o1", OrderStatus.CONFIRMED, OrderStatus.CANCELLED, "u1"));

      expect(spy).toHaveBeenCalledWith("o1", "u1", "Automatic refund — order cancelled after payment");
    });
  });

  describe("initiateForOrder", () => {
    it("rejects when there is no succeeded payment to refund", async () => {
      paymentsService.findSucceededPaymentForOrder.mockResolvedValue(null);

      await expect(service.initiateForOrder("o1", "u1", "test")).rejects.toMatchObject({ code: "NO_SUCCEEDED_PAYMENT" });
      expect(gateway.refund).not.toHaveBeenCalled();
    });

    it("creates a SUCCEEDED refund and marks the order REFUNDED", async () => {
      const updateCalls: any[] = [];
      dataSource.transaction.mockImplementation(async (cb: any) =>
        cb({ create: (Entity: any, data: any) => data, save: async (x: any) => x, update: async (...args: any[]) => updateCalls.push(args) }),
      );

      const result = await service.initiateForOrder("o1", "u1", "customer requested");

      expect(gateway.refund).toHaveBeenCalledWith("pay_1", 279);
      expect(result.status).toBe(RefundStatus.SUCCEEDED);
      expect(result.gatewayRefundId).toBe("mock_refund_1");
      expect(updateCalls).toContainEqual([Order, "o1", { paymentStatus: OrderPaymentStatus.REFUNDED }]);
    });

    it("records a FAILED refund and leaves the order's paymentStatus untouched when the gateway call fails", async () => {
      gateway.refund.mockRejectedValue(new Error("gateway unreachable"));
      const updateCalls: any[] = [];
      dataSource.transaction.mockImplementation(async (cb: any) =>
        cb({ create: (Entity: any, data: any) => data, save: async (x: any) => x, update: async (...args: any[]) => updateCalls.push(args) }),
      );

      const result = await service.initiateForOrder("o1", "u1", "test");

      expect(result.status).toBe(RefundStatus.FAILED);
      expect(result.failureReason).toBe("gateway unreachable");
      expect(updateCalls).toHaveLength(0);
    });
  });
});
