import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Review } from "./entities/review.entity";
import { Order } from "../orders/entities/order.entity";
import { ReviewsService } from "./reviews.service";
import { CustomerReviewsController } from "./customer-reviews.controller";
import { RestaurantReviewsController } from "./restaurant-reviews.controller";
import { PublicReviewsController } from "./public-reviews.controller";
import { AdminReviewsController } from "./admin-reviews.controller";

@Module({
  imports: [
    // Order is read-only here (ownership + DELIVERED-status checks) — injected directly rather
    // than importing OrdersModule, the same "avoid growing another module's service for a
    // storefront-adjacent read" pattern StoreModule already established. Zero risk of a circular
    // module dependency, which is exactly why RestaurantsModule/StoreModule can both safely import
    // ReviewsModule below for rating summaries without anything cycling back here.
    TypeOrmModule.forFeature([Review, Order]),
  ],
  controllers: [CustomerReviewsController, RestaurantReviewsController, PublicReviewsController, AdminReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
