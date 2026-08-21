import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { UnauthorizedException } from "@nestjs/common";
import { QueryFailedError } from "typeorm";
import * as crypto from "crypto";
import { WebhooksService } from "./webhooks.service";
import { WebhookEvent } from "./entities/webhook-event.entity";
import { PaymentsService } from "../payments/payments.service";
import { PaymentWebhookDto } from "./dto/payment-webhook.dto";

const SECRET = "test-webhook-secret";

function sign(body: Buffer): string {
  return crypto.createHmac("sha256", SECRET).update(body).digest("hex");
}

describe("WebhooksService", () => {
  let service: WebhooksService;
  let eventsRepo: { create: jest.Mock; save: jest.Mock; update: jest.Mock };
  let paymentsService: { applyWebhookOutcome: jest.Mock; findOwnedPayment: jest.Mock };

  const dto: PaymentWebhookDto = {
    id: "evt_1",
    event: "payment.captured",
    payload: { gatewayOrderId: "mock_order_1", gatewayPaymentId: "mock_pay_1" },
  };
  const rawBody = Buffer.from(JSON.stringify(dto));

  beforeEach(async () => {
    eventsRepo = {
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ id: "we1", ...x })),
      update: jest.fn(),
    };
    paymentsService = {
      applyWebhookOutcome: jest.fn().mockResolvedValue(undefined),
      findOwnedPayment: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        WebhooksService,
        { provide: getRepositoryToken(WebhookEvent), useValue: eventsRepo },
        { provide: PaymentsService, useValue: paymentsService },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(SECRET) } },
      ],
    }).compile();

    service = moduleRef.get(WebhooksService);
  });

  describe("processPaymentWebhook", () => {
    it("rejects an invalid signature without persisting anything", async () => {
      await expect(service.processPaymentWebhook(rawBody, "totally-wrong", dto)).rejects.toBeInstanceOf(UnauthorizedException);
      expect(eventsRepo.save).not.toHaveBeenCalled();
    });

    it("rejects a missing signature", async () => {
      await expect(service.processPaymentWebhook(rawBody, undefined, dto)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("applies a captured event and marks it processed", async () => {
      await service.processPaymentWebhook(rawBody, sign(rawBody), dto);

      expect(paymentsService.applyWebhookOutcome).toHaveBeenCalledWith("mock_order_1", true, "mock_pay_1", null);
      expect(eventsRepo.update).toHaveBeenCalledWith("we1", { processedAt: expect.any(Date) });
    });

    it("applies a failed event with a failure reason", async () => {
      const failDto: PaymentWebhookDto = { ...dto, event: "payment.failed" };
      const failBody = Buffer.from(JSON.stringify(failDto));

      await service.processPaymentWebhook(failBody, sign(failBody), failDto);

      expect(paymentsService.applyWebhookOutcome).toHaveBeenCalledWith("mock_order_1", false, "mock_pay_1", "Reported failed by gateway webhook");
    });

    it("acks a duplicate delivery without reprocessing", async () => {
      const dbError = Object.assign(new QueryFailedError("insert", [], new Error("duplicate")), { code: "23505" });
      eventsRepo.save.mockRejectedValue(dbError);

      await service.processPaymentWebhook(rawBody, sign(rawBody), dto);

      expect(paymentsService.applyWebhookOutcome).not.toHaveBeenCalled();
    });

    it("records a processing error instead of throwing when the payment can't be resolved", async () => {
      paymentsService.applyWebhookOutcome.mockRejectedValue(new Error("No payment found"));

      await service.processPaymentWebhook(rawBody, sign(rawBody), dto);

      expect(eventsRepo.update).toHaveBeenCalledWith("we1", { processingError: "No payment found" });
    });
  });

  describe("mockSend", () => {
    it("builds a correctly signed payload from the owned payment and processes it", async () => {
      paymentsService.findOwnedPayment.mockResolvedValue({ id: "p1", orderId: "o1", gatewayOrderId: "mock_order_9", gatewayPaymentId: null });

      await service.mockSend("o1", "u1", "p1", true);

      expect(paymentsService.applyWebhookOutcome).toHaveBeenCalledWith("mock_order_9", true, expect.any(String), null);
    });
  });
});
