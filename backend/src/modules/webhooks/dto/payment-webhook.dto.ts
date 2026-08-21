import { Type } from "class-transformer";
import { IsIn, IsString, MinLength, ValidateNested } from "class-validator";

export const PAYMENT_WEBHOOK_EVENTS = ["payment.captured", "payment.failed"] as const;
export type PaymentWebhookEventType = (typeof PAYMENT_WEBHOOK_EVENTS)[number];

class PaymentWebhookPayloadDto {
  @IsString()
  @MinLength(1)
  gatewayOrderId!: string;

  @IsString()
  @MinLength(1)
  gatewayPaymentId!: string;
}

/**
 * Loosely mirrors a real gateway's webhook envelope (Razorpay's, for
 * instance, is `{ id, event, payload: { payment: { entity: {...} } } }`) —
 * flattened here since the concept (an id for idempotency, an event type, a
 * payload) is what matters architecturally, not matching one gateway's exact
 * nesting.
 */
export class PaymentWebhookDto {
  @IsString()
  @MinLength(1)
  id!: string;

  @IsIn(PAYMENT_WEBHOOK_EVENTS)
  event!: PaymentWebhookEventType;

  @ValidateNested()
  @Type(() => PaymentWebhookPayloadDto)
  payload!: PaymentWebhookPayloadDto;
}
