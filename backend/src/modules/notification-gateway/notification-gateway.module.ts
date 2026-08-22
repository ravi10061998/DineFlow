import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NotificationDelivery } from "./entities/notification-delivery.entity";
import { NOTIFICATION_GATEWAY } from "./gateways/notification-gateway.interface";
import { MockNotificationGateway } from "./gateways/mock-notification.gateway";
import { NotificationDispatchService } from "./notification-dispatch.service";
import { AdminNotificationDeliveriesController } from "./admin-notification-deliveries.controller";

/**
 * Deliberately zero module-level dependencies beyond TypeOrm — Auth,
 * Subscriptions, and the in-app Notifications module (Module 16) all need to
 * send an email/SMS without pulling in each other's dependency graphs. Same
 * "keep it dependency-free so anything can safely import it" reasoning as
 * Module 25's `ReviewsModule`.
 */
@Module({
  imports: [TypeOrmModule.forFeature([NotificationDelivery])],
  controllers: [AdminNotificationDeliveriesController],
  providers: [{ provide: NOTIFICATION_GATEWAY, useClass: MockNotificationGateway }, NotificationDispatchService],
  exports: [NotificationDispatchService],
})
export class NotificationGatewayModule {}
