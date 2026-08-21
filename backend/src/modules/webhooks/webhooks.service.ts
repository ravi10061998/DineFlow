import { Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { QueryFailedError, Repository } from "typeorm";
import * as crypto from "crypto";
import { WebhookEvent } from "./entities/webhook-event.entity";
import { PaymentWebhookDto } from "./dto/payment-webhook.dto";
import { PaymentsService } from "../payments/payments.service";

/** Postgres unique_violation error code. */
const UNIQUE_VIOLATION = "23505";

@Injectable()
export class WebhooksService {
  constructor(
    @InjectRepository(WebhookEvent) private readonly eventsRepository: Repository<WebhookEvent>,
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * The real entry point a gateway's server would call. `rawBody` must be the
   * exact bytes the gateway signed — any JSON re-serialization before this
   * point would silently break the signature (a common real-world
   * integration bug), which is why `main.ts` enables Nest's raw-body capture.
   */
  async processPaymentWebhook(rawBody: Buffer, signature: string | undefined, dto: PaymentWebhookDto): Promise<void> {
    const signatureValid = this.verifySignature(rawBody, signature);
    if (!signatureValid) {
      // Can't trust anything the payload claims (including its own event id) without a valid
      // signature, so nothing is persisted here — an attacker could otherwise spam fabricated
      // event ids into the audit log.
      throw new UnauthorizedException("Invalid webhook signature");
    }

    // Claim-then-process: insert the event row FIRST. Its unique (gateway, gatewayEventId)
    // constraint is the actual idempotency guard — if a gateway redelivers the same event
    // (normal at-least-once delivery semantics), this insert collides and we ack without
    // reprocessing, rather than risking a double-apply from a racy read-then-check.
    const event = this.eventsRepository.create({
      gateway: "MOCK",
      gatewayEventId: dto.id,
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

    try {
      const succeeded = dto.event === "payment.captured";
      await this.paymentsService.applyWebhookOutcome(
        dto.payload.gatewayOrderId,
        succeeded,
        dto.payload.gatewayPaymentId,
        succeeded ? null : "Reported failed by gateway webhook",
      );
      await this.eventsRepository.update(saved.id, { processedAt: new Date() });
    } catch (err) {
      // Recorded, not thrown — a gateway that gets anything but 200 will retry the same
      // event forever. A payment we can never resolve (wrong id, already-deleted record) is a
      // permanent failure, not a transient one worth an infinite redelivery loop.
      const message = err instanceof Error ? err.message : "Unknown processing error";
      await this.eventsRepository.update(saved.id, { processingError: message });
    }
  }

  /**
   * Stands in for "the gateway sent an async webhook confirming this
   * payment" — there is no real gateway to deliver one. Builds the exact
   * envelope + signature a real delivery would carry and runs it through
   * `processPaymentWebhook` directly (in-process, not over HTTP — the point
   * is exercising the real signature-check + idempotency + apply logic, not
   * proving this server can call itself). Delete this method (and its
   * controller route) when a real gateway's webhooks replace it.
   */
  async mockSend(orderId: string, customerId: string, paymentId: string, succeed: boolean) {
    const payment = await this.paymentsService.findOwnedPayment(orderId, customerId, paymentId);
    const dto: PaymentWebhookDto = {
      id: `evt_${crypto.randomBytes(8).toString("hex")}`,
      event: succeed ? "payment.captured" : "payment.failed",
      payload: {
        gatewayOrderId: payment.gatewayOrderId,
        gatewayPaymentId: payment.gatewayPaymentId ?? `mock_pay_${crypto.randomBytes(6).toString("hex")}`,
      },
    };
    const rawBody = Buffer.from(JSON.stringify(dto));
    const signature = this.sign(rawBody);

    await this.processPaymentWebhook(rawBody, signature, dto);
    return this.paymentsService.findOwnedPayment(orderId, customerId, paymentId);
  }

  findAllForAdmin(): Promise<WebhookEvent[]> {
    return this.eventsRepository.find({ order: { createdAt: "DESC" } });
  }

  private verifySignature(rawBody: Buffer, signature: string | undefined): boolean {
    if (!signature) return false;
    return this.sign(rawBody) === signature;
  }

  private sign(rawBody: Buffer): string {
    const secret = this.configService.get<string>("PAYMENT_WEBHOOK_SECRET", "dev-only-change-me-webhook-secret");
    return crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  }
}
