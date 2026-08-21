import { Body, Controller, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { CustomerGuard } from "../customers/guards/customer.guard";
import { WebhooksService } from "./webhooks.service";
import { MockSendWebhookDto } from "./dto/mock-send-webhook.dto";

/**
 * Dev/demo-only: stands in for a real gateway's own webhook delivery, which
 * no local server can trigger since there is no real gateway configured.
 * Delete this controller entirely when a real gateway's webhooks replace it
 * — the endpoint it drives (`POST /webhooks/payments`) stays.
 */
@ApiTags("Customer Self-Service - Payments")
@UseGuards(CustomerGuard)
@Controller("customer/me/orders/:orderId/payment/:paymentId/mock-webhook")
export class MockWebhookController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  async send(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId", ParseUUIDPipe) orderId: string,
    @Param("paymentId", ParseUUIDPipe) paymentId: string,
    @Body() dto: MockSendWebhookDto,
  ) {
    const data = await this.webhooksService.mockSend(orderId, user.userId, paymentId, dto.succeed);
    return { message: "Webhook simulated", data };
  }
}
