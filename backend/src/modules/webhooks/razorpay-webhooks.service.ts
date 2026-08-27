import { Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { QueryFailedError, Repository } from "typeorm";
import Razorpay from "razorpay";
import { WebhookEvent } from "./entities/webhook-event.entity";
import { RazorpayWebhookDto } from "./dto/razorpay-webhook.dto";
import { PaymentsService } from "../payments/payments.service";

/** Postgres unique_violation error code. */
const UNIQUE_VIOLATION = "23505";

const HANDLED_EVENTS = ["payment.captured", "payment.failed"] as const;

/**
 * The real counterpart to WebhooksService (which stays exactly as it is — its own mock envelope,
 * signature scheme, and idempotency logic keep working unchanged, still exercised by
 * mock-send/tests). This handles Razorpay's actual webhook shape and signature scheme instead,
 * sharing only `PaymentsService.applyWebhookOutcome` — the one piece of business logic that was
 * always meant to be gateway-agnostic — and the same `webhook_events` audit table, distinguished
 * by `gateway: "RAZORPAY"` instead of `"MOCK"`.
 */
@Injectable()
export class RazorpayWebhooksService {
  constructor(
    @InjectRepository(WebhookEvent) private readonly eventsRepository: Repository<WebhookEvent>,
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {}

  async processWebhook(rawBody: Buffer, signature: string | undefined, dto: RazorpayWebhookDto): Promise<void> {
    if (!signature || !this.verifySignature(rawBody, signature)) {
      throw new UnauthorizedException("Invalid webhook signature");
    }

    // Razorpay redelivers the SAME event for the SAME payment on a failed/slow ack, rather than
    // minting a new delivery id each time — (event type, payment id) is the actual dedup grain,
    // not a separate top-level event id Razorpay's payload doesn't reliably include.
    const paymentId = dto.payload.payment.entity.id;
    const gatewayEventId = `${dto.event}_${paymentId}`;

    const event = this.eventsRepository.create({
      gateway: "RAZORPAY",
      gatewayEventId,
      eventType: dto.event,
      payload: dto as unknown as Record<string, unknown>,
      signatureValid: true,
    });

    let saved: WebhookEvent;
    try {
      saved = await this.eventsRepository.save(event);
    } catch (err) {
      if (err instanceof QueryFailedError && (err as unknown as { code?: string }).code === UNIQUE_VIOLATION) {
        return; // duplicate delivery — already received (and processed, or being processed)
      }
      throw err;
    }

    // Recorded for audit regardless (every real Razorpay account setting sends far more event
    // types than just these two if configured for "all events") — only these two actually change
    // a payment's outcome; anything else is acknowledged and left otherwise untouched.
    if (!HANDLED_EVENTS.includes(dto.event as (typeof HANDLED_EVENTS)[number])) {
      await this.eventsRepository.update(saved.id, { processedAt: new Date() });
      return;
    }

    try {
      const succeeded = dto.event === "payment.captured";
      await this.paymentsService.applyWebhookOutcome(
        dto.payload.payment.entity.order_id,
        succeeded,
        paymentId,
        succeeded ? null : "Reported failed by Razorpay webhook",
      );
      await this.eventsRepository.update(saved.id, { processedAt: new Date() });
    } catch (err) {
      // Recorded, not thrown — Razorpay retries a non-2xx response for a while; a payment we can
      // never resolve (unknown order id) is a permanent failure, not worth an infinite redelivery loop.
      const message = err instanceof Error ? err.message : "Unknown processing error";
      await this.eventsRepository.update(saved.id, { processingError: message });
    }
  }

  private verifySignature(rawBody: Buffer, signature: string): boolean {
    // Missing config means "can never verify," a 401 — not a 500 from getOrThrow. This route is
    // real infrastructure (unlike PAYMENT_GATEWAY's factory) since Razorpay itself calls it
    // directly; nothing in this app hits it unless a real webhook is actually configured.
    const secret = this.configService.get<string>("RAZORPAY_WEBHOOK_SECRET");
    if (!secret) return false;
    return Razorpay.validateWebhookSignature(rawBody.toString(), signature, secret);
  }
}
