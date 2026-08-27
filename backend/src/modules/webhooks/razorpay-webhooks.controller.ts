import { BadRequestException, Body, Controller, Headers, Post, RawBodyRequest, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { Public } from "../../common/decorators/public.decorator";
import { RazorpayWebhooksService } from "./razorpay-webhooks.service";
import { RazorpayWebhookDto } from "./dto/razorpay-webhook.dto";

/**
 * The URL to register in Razorpay's dashboard (Settings → Webhooks) once a real account exists —
 * separate route from the existing mock `/webhooks/payments`, which keeps working unchanged for
 * local dev/tests that have no real Razorpay account to point at.
 */
@ApiTags("Webhooks")
@Public()
@Controller("webhooks/razorpay")
export class RazorpayWebhooksController {
  constructor(private readonly razorpayWebhooksService: RazorpayWebhooksService) {}

  @Post()
  async handle(
    @Req() request: RawBodyRequest<Request>,
    @Headers("x-razorpay-signature") signature: string | undefined,
    @Body() dto: RazorpayWebhookDto,
  ) {
    if (!request.rawBody) {
      throw new BadRequestException("Raw request body unavailable");
    }
    await this.razorpayWebhooksService.processWebhook(request.rawBody, signature, dto);
    return { message: "Webhook processed", data: null };
  }
}
