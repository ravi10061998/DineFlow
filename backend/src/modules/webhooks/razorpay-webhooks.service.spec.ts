import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { QueryFailedError } from "typeorm";
import { UnauthorizedException } from "@nestjs/common";
import Razorpay from "razorpay";
import { RazorpayWebhooksService } from "./razorpay-webhooks.service";
import { WebhookEvent } from "./entities/webhook-event.entity";
import { PaymentsService } from "../payments/payments.service";

jest.mock("razorpay", () => {
  const ctor = jest.fn();
  (ctor as unknown as { validateWebhookSignature: jest.Mock }).validateWebhookSignature = jest.fn();
  return ctor;
});

function envelope(event: string, paymentId = "pay_1", orderId = "order_1") {
  return { event, payload: { payment: { entity: { id: paymentId, order_id: orderId } } } } as any;
}

describe("RazorpayWebhooksService", () => {
  let service: RazorpayWebhooksService;
  let eventsRepo: { create: jest.Mock; save: jest.Mock; update: jest.Mock };
  let paymentsService: { applyWebhookOutcome: jest.Mock };
  let validateWebhookSignature: jest.Mock;

  beforeEach(async () => {
    validateWebhookSignature = (Razorpay as unknown as { validateWebhookSignature: jest.Mock }).validateWebhookSignature;
    validateWebhookSignature.mockReset();

    eventsRepo = {
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ id: "evt-row-1", ...x })),
      update: jest.fn().mockResolvedValue(undefined),
    };
    paymentsService = { applyWebhookOutcome: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        RazorpayWebhooksService,
        { provide: getRepositoryToken(WebhookEvent), useValue: eventsRepo },
        { provide: PaymentsService, useValue: paymentsService },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue("whsec_test") } },
      ],
    }).compile();

    service = moduleRef.get(RazorpayWebhooksService);
  });

  it("rejects with UnauthorizedException when no signature header is present", async () => {
    await expect(service.processWebhook(Buffer.from("{}"), undefined, envelope("payment.captured"))).rejects.toThrow(UnauthorizedException);
    expect(eventsRepo.save).not.toHaveBeenCalled();
  });

  it("rejects with UnauthorizedException when the signature doesn't verify", async () => {
    validateWebhookSignature.mockReturnValue(false);
    await expect(service.processWebhook(Buffer.from("{}"), "bad-sig", envelope("payment.captured"))).rejects.toThrow(UnauthorizedException);
    expect(eventsRepo.save).not.toHaveBeenCalled();
  });

  it("payment.captured applies a succeeded outcome keyed by the Razorpay order id", async () => {
    validateWebhookSignature.mockReturnValue(true);

    await service.processWebhook(Buffer.from("{}"), "good-sig", envelope("payment.captured", "pay_1", "order_1"));

    expect(paymentsService.applyWebhookOutcome).toHaveBeenCalledWith("order_1", true, "pay_1", null);
  });

  it("payment.failed applies a failed outcome with a reason", async () => {
    validateWebhookSignature.mockReturnValue(true);

    await service.processWebhook(Buffer.from("{}"), "good-sig", envelope("payment.failed", "pay_2", "order_2"));

    expect(paymentsService.applyWebhookOutcome).toHaveBeenCalledWith("order_2", false, "pay_2", "Reported failed by Razorpay webhook");
  });

  it("an event type this app doesn't act on is still recorded, but applyWebhookOutcome is never called", async () => {
    validateWebhookSignature.mockReturnValue(true);

    await service.processWebhook(Buffer.from("{}"), "good-sig", envelope("refund.processed"));

    expect(paymentsService.applyWebhookOutcome).not.toHaveBeenCalled();
    expect(eventsRepo.update).toHaveBeenCalledWith("evt-row-1", { processedAt: expect.any(Date) });
  });

  it("a duplicate delivery (unique constraint violation) is silently absorbed, not reprocessed", async () => {
    validateWebhookSignature.mockReturnValue(true);
    const dupError = Object.assign(new QueryFailedError("insert", [], new Error("duplicate")), { code: "23505" });
    eventsRepo.save.mockRejectedValueOnce(dupError);

    await service.processWebhook(Buffer.from("{}"), "good-sig", envelope("payment.captured"));

    expect(paymentsService.applyWebhookOutcome).not.toHaveBeenCalled();
  });

  it("records a processing error rather than throwing when applyWebhookOutcome fails", async () => {
    validateWebhookSignature.mockReturnValue(true);
    paymentsService.applyWebhookOutcome.mockRejectedValueOnce(new Error("no payment found"));

    await expect(service.processWebhook(Buffer.from("{}"), "good-sig", envelope("payment.captured"))).resolves.not.toThrow();

    expect(eventsRepo.update).toHaveBeenCalledWith("evt-row-1", { processingError: "no payment found" });
  });
});
