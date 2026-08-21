import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SubscriptionPlan } from "./entities/subscription-plan.entity";
import { TrialSettings } from "./entities/trial-settings.entity";
import { RestaurantSubscription } from "./entities/restaurant-subscription.entity";
import { SubscriptionEvent } from "./entities/subscription-event.entity";
import { SubscriptionsService } from "./subscriptions.service";
import { AdminSubscriptionsController } from "./admin-subscriptions.controller";
import { RestaurantSubscriptionController } from "./restaurant-subscription.controller";

@Module({
  imports: [TypeOrmModule.forFeature([SubscriptionPlan, TrialSettings, RestaurantSubscription, SubscriptionEvent])],
  controllers: [AdminSubscriptionsController, RestaurantSubscriptionController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
