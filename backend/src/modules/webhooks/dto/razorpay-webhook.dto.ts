import { Type } from "class-transformer";
import { IsString, MinLength, ValidateNested } from "class-validator";

class RazorpayPaymentEntityDto {
  @IsString()
  @MinLength(1)
  id!: string;

  @IsString()
  @MinLength(1)
  order_id!: string;
}

class RazorpayPaymentWrapperDto {
  @ValidateNested()
  @Type(() => RazorpayPaymentEntityDto)
  entity!: RazorpayPaymentEntityDto;
}

class RazorpayWebhookPayloadDto {
  @ValidateNested()
  @Type(() => RazorpayPaymentWrapperDto)
  payment!: RazorpayPaymentWrapperDto;
}

/**
 * Razorpay's real webhook envelope — `{ entity: "event", account_id, event, contains, payload:
 * { payment: { entity: {...} } }, created_at }`. Only the fields this app actually reads
 * (`event`, `payload.payment.entity.id`/`order_id`) are validated; the rest of Razorpay's payload
 * passes through untouched into `payload` (jsonb) on the stored WebhookEvent row for audit
 * purposes, same as the existing mock envelope does.
 */
export class RazorpayWebhookDto {
  @IsString()
  @MinLength(1)
  event!: string;

  @ValidateNested()
  @Type(() => RazorpayWebhookPayloadDto)
  payload!: RazorpayWebhookPayloadDto;
}
