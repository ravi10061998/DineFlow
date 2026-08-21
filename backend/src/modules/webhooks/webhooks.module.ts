import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WebhookEvent } from "./entities/webhook-event.entity";
import { WebhooksService } from "./webhooks.service";
import { PaymentWebhooksController } from "./payment-webhooks.controller";
import { MockWebhookController } from "./mock-webhook.controller";
import { AdminWebhooksController } from "./admin-webhooks.controller";
import { PaymentsModule } from "../payments/payments.module";

@Module({
  imports: [TypeOrmModule.forFeature([WebhookEvent]), PaymentsModule],
  controllers: [PaymentWebhooksController, MockWebhookController, AdminWebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
