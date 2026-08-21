import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Notification } from "./entities/notification.entity";
import { NotificationsService } from "./notifications.service";
import { CustomerNotificationsController } from "./customer-notifications.controller";
import { OrdersModule } from "../orders/orders.module";

@Module({
  imports: [TypeOrmModule.forFeature([Notification]), OrdersModule],
  controllers: [CustomerNotificationsController],
  providers: [NotificationsService],
})
export class NotificationsModule {}
