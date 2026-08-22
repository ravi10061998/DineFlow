import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Order } from "../orders/entities/order.entity";
import { OrderItem } from "../orders/entities/order-item.entity";
import { AnalyticsService } from "./analytics.service";
import { AdminAnalyticsController } from "./admin-analytics.controller";
import { RestaurantAnalyticsController } from "./restaurant-analytics.controller";
import { ReviewsModule } from "../reviews/reviews.module";

@Module({
  imports: [
    // Read-only cross-cutting aggregate queries — the same "inject the repositories directly
    // rather than growing Orders' own service with reporting-specific methods" reasoning
    // StoreModule established for the identical kind of read in Module 16.
    TypeOrmModule.forFeature([Order, OrderItem]),
    ReviewsModule,
  ],
  controllers: [AdminAnalyticsController, RestaurantAnalyticsController],
  providers: [AnalyticsService],
  // Exported so Reports (Module 28) can reuse the exact same revenue time-series query instead
  // of re-deriving it — a CSV export should never drift from what its on-screen chart showed.
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
