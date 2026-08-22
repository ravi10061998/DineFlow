import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SubscriptionPlan } from "./entities/subscription-plan.entity";
import { TrialSettings } from "./entities/trial-settings.entity";
import { RestaurantSubscription } from "./entities/restaurant-subscription.entity";
import { SubscriptionEvent } from "./entities/subscription-event.entity";
import { Restaurant } from "../restaurants/entities/restaurant.entity";
import { SubscriptionsService } from "./subscriptions.service";
import { AdminSubscriptionsController } from "./admin-subscriptions.controller";
import { RestaurantSubscriptionController } from "./restaurant-subscription.controller";
import { NotificationGatewayModule } from "../notification-gateway/notification-gateway.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([SubscriptionPlan, TrialSettings, RestaurantSubscription, SubscriptionEvent, Restaurant]),
    NotificationGatewayModule,
  ],
  controllers: [AdminSubscriptionsController, RestaurantSubscriptionController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
