import { Module } from "@nestjs/common";
import { AdminDashboardController } from "./admin-dashboard.controller";
import { RestaurantsModule } from "../restaurants/restaurants.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";

@Module({
  imports: [RestaurantsModule, SubscriptionsModule],
  controllers: [AdminDashboardController],
})
export class DashboardModule {}
