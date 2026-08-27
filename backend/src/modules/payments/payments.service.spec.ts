import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { NotFoundException } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { Payment, PaymentStatus } from "./entities/payment.entity";
import { Order, OrderPaymentStatus, OrderStatus } from "../orders/entities/order.entity";
import { OrdersService } from "../orders/orders.service";
import { PAYMENT_GATEWAY } from "./gateways/payment-gateway.interface";
import { MockPaymentGateway } from "./gateways/mock-payment.gateway";

describe("PaymentsService", () => {
  let service: PaymentsService;
  let paymentsRepo: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; find: jest.Mock };
  let ordersService: { findOneOrThrow: jest.Mock };
  let gateway: { name: string; clientKey: string; createOrder: jest.Mock; verifySignature: jest.Mock };
  let dataSource: { transaction: jest.Mock };
  let eventEmitter: { emit: jest.Mock };

  const order = { id: "o1", customerId: "u1", orderNumber: "ORD-1", totalAmount: "340.00", status: OrderStatus.PLACED, paymentStatus: OrderPaymentStatus.PENDING };

  beforeEach(async () => {
    paymentsRepo = {
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
      findOne: jest.fn(),
      find: jest.fn(),
    };
    ordersService = { findOneOrThrow: jest.fn().mockResolvedValue(order) };
    gateway = {
      name: "MOCK",
      clientKey: "mock_key_id_dev",
      createOrder: jest.fn().mockResolvedValue({ gatewayOrderId: "mock_order_1", amount: 340, currency: "INR" }),
      verifySignature: jest.fn().mockReturnValue(true),
    };
    dataSource = { transaction: jest.fn() };
    eventEmitter = { emit: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getRepositoryToken(Payment), useValue: paymentsRepo },
        { provide: OrdersService, useValue: ordersService },
        { provide: PAYMENT_GATEWAY, useValue: gateway },
        { provide: MockPaymentGateway, useValue: { sign: jest.fn().mockReturnValue("mock-signature") } },
        { provide: DataSource, useValue: dataSource },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = moduleRef.get(PaymentsService);
  });

  describe("initiate", () => {
    it("rejects an already-paid order", async () => {
      ordersService.findOneOrThrow.mockResolvedValue({ ...order, paymentStatus: OrderPaymentStatus.PAID });

      await expect(service.initiate("o1", "u1")).rejects.toMatchObject({ code: "ORDER_ALREADY_PAID" });
      expect(gateway.createOrder).not.toHaveBeenCalled();
    });

    it("rejects a cancelled order", async () => {
      ordersService.findOneOrThrow.mockResolvedValue({ ...order, status: OrderStatus.CANCELLED });

      await expect(service.initiate("o1", "u1")).rejects.toMatchObject({ code: "ORDER_CANCELLED" });
    });

    it("creates a gateway order and a CREATED payment row", async () => {
      const result = await service.initiate("o1", "u1");

      expect(gateway.createOrder).toHaveBeenCalledWith(340, "INR", "ORD-1");
      expect(result.payment.status).toBe(PaymentStatus.CREATED);
      expect(result.payment.gatewayOrderId).toBe("mock_order_1");
      expect(result.gatewayKeyId).toBe("mock_key_id_dev");
    });

    it("gatewayKeyId always reflects whichever gateway is actually active, never a separate config lookup", async () => {
      // Regression test: this exact mismatch shipped once for real -- a real Razorpay order got
      // created (gateway.createOrder), but gatewayKeyId still came from a different config key
      // than the one the active gateway was constructed with, so the frontend never opened the
      // real checkout widget. gatewayKeyId must come from gateway.clientKey, not its own lookup.
      gateway.clientKey = "rzp_test_realKeyFromRazorpay";

      const result = await service.initiate("o1", "u1");

      expect(result.gatewayKeyId).toBe("rzp_test_realKeyFromRazorpay");
    });
  });

  describe("verify", () => {
    const payment = { id: "p1", orderId: "o1", gatewayOrderId: "mock_order_1", status: PaymentStatus.CREATED };

    it("404s when the payment doesn't exist for this order", async () => {
      paymentsRepo.findOne.mockResolvedValue(null);

      await expect(service.verify("o1", "u1", { paymentId: "p1", gatewayPaymentId: "pay_1", signature: "sig" })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("rejects re-verifying a payment that's already been processed", async () => {
      paymentsRepo.findOne.mockResolvedValue({ ...payment, status: PaymentStatus.SUCCEEDED });

      await expect(service.verify("o1", "u1", { paymentId: "p1", gatewayPaymentId: "pay_1", signature: "sig" })).rejects.toMatchObject({
        code: "PAYMENT_ALREADY_PROCESSED",
      });
    });

    it("marks the payment SUCCEEDED and the order PAID on a valid signature", async () => {
      paymentsRepo.findOne.mockResolvedValueOnce(payment).mockResolvedValueOnce({ ...payment, order, status: PaymentStatus.SUCCEEDED });
      gateway.verifySignature.mockReturnValue(true);
      const updateCalls: any[] = [];
      dataSource.transaction.mockImplementation(async (cb: any) => cb({ update: async (...args: any[]) => updateCalls.push(args) }));

      const result = await service.verify("o1", "u1", { paymentId: "p1", gatewayPaymentId: "pay_1", signature: "good-sig" });

      expect(gateway.verifySignature).toHaveBeenCalledWith("mock_order_1", "pay_1", "good-sig");
      expect(updateCalls).toContainEqual([
        Payment,
        "p1",
        { gatewayPaymentId: "pay_1", status: PaymentStatus.SUCCEEDED, failureReason: null },
      ]);
      expect(updateCalls).toContainEqual([Order, "o1", { paymentStatus: OrderPaymentStatus.PAID }]);
      expect(result.status).toBe(PaymentStatus.SUCCEEDED);
      expect(eventEmitter.emit).toHaveBeenCalledWith("payment.succeeded", expect.objectContaining({ paymentId: "p1", orderId: "o1" }));
    });

    it("marks the payment FAILED and the order FAILED, then throws, on an invalid signature", async () => {
      paymentsRepo.findOne.mockResolvedValueOnce(payment);
      gateway.verifySignature.mockReturnValue(false);
      const updateCalls: any[] = [];
      dataSource.transaction.mockImplementation(async (cb: any) => cb({ update: async (...args: any[]) => updateCalls.push(args) }));

      await expect(service.verify("o1", "u1", { paymentId: "p1", gatewayPaymentId: "pay_1", signature: "bad-sig" })).rejects.toMatchObject({
        code: "PAYMENT_VERIFICATION_FAILED",
      });

      expect(updateCalls).toContainEqual([
        Payment,
        "p1",
        { gatewayPaymentId: "pay_1", status: PaymentStatus.FAILED, failureReason: "Signature verification failed" },
      ]);
      expect(updateCalls).toContainEqual([Order, "o1", { paymentStatus: OrderPaymentStatus.FAILED }]);
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe("findOwnedPayment", () => {
    it("404s when the order isn't owned by this customer", async () => {
      ordersService.findOneOrThrow.mockRejectedValue(new NotFoundException());

      await expect(service.findOwnedPayment("o1", "someone-else", "p1")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("404s when the payment doesn't belong to the order", async () => {
      paymentsRepo.findOne.mockResolvedValue(null);

      await expect(service.findOwnedPayment("o1", "u1", "p1")).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("applyWebhookOutcome", () => {
    it("404s when no payment matches the gateway order id", async () => {
      paymentsRepo.findOne.mockResolvedValue(null);

      await expect(service.applyWebhookOutcome("unknown_gateway_order", true, "pay_1", null)).rejects.toBeInstanceOf(NotFoundException);
    });

    it("is a no-op when the payment has already been resolved", async () => {
      paymentsRepo.findOne.mockResolvedValue({ id: "p1", orderId: "o1", gatewayOrderId: "mock_order_1", status: PaymentStatus.SUCCEEDED });

      await service.applyWebhookOutcome("mock_order_1", true, "pay_1", null);

      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it("applies the outcome when the payment is still CREATED", async () => {
      paymentsRepo.findOne.mockResolvedValue({ id: "p1", orderId: "o1", gatewayOrderId: "mock_order_1", status: PaymentStatus.CREATED });
      const updateCalls: any[] = [];
      dataSource.transaction.mockImplementation(async (cb: any) => cb({ update: async (...args: any[]) => updateCalls.push(args) }));

      await service.applyWebhookOutcome("mock_order_1", true, "pay_1", null);

      expect(updateCalls).toContainEqual([Payment, "p1", { gatewayPaymentId: "pay_1", status: PaymentStatus.SUCCEEDED, failureReason: null }]);
      expect(updateCalls).toContainEqual([Order, "o1", { paymentStatus: OrderPaymentStatus.PAID }]);
    });
  });
});
