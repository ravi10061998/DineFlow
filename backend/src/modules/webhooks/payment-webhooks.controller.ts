import { BadRequestException, Body, Controller, Headers, Post, RawBodyRequest, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { Public } from "../../common/decorators/public.decorator";
import { WebhooksService } from "./webhooks.service";
import { PaymentWebhookDto } from "./dto/payment-webhook.dto";

@ApiTags("Webhooks")
@Public()
@Controller("webhooks/payments")
export class PaymentWebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  async handle(@Req() request: RawBodyRequest<Request>, @Headers("x-webhook-signature") signature: string, @Body() dto: PaymentWebhookDto) {
    if (!request.rawBody) {
      // Would only happen if rawBody capture isn't enabled at bootstrap — a config bug, not a
      // caller error, but still safer to reject than to verify a signature against nothing.
      throw new BadRequestException("Raw request body unavailable");
    }
    await this.webhooksService.processPaymentWebhook(request.rawBody, signature, dto);
    return { message: "Webhook processed", data: null };
  }
}
