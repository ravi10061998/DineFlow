import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Notification } from "./entities/notification.entity";
import { NotificationsService } from "./notifications.service";
import { CustomerNotificationsController } from "./customer-notifications.controller";
import { OrdersModule } from "../orders/orders.module";
import { UsersModule } from "../users/users.module";
import { NotificationGatewayModule } from "../notification-gateway/notification-gateway.module";

@Module({
  imports: [TypeOrmModule.forFeature([Notification]), OrdersModule, UsersModule, NotificationGatewayModule],
  controllers: [CustomerNotificationsController],
  providers: [NotificationsService],
})
export class NotificationsModule {}
