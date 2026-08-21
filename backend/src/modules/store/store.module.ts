import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Restaurant } from "../restaurants/entities/restaurant.entity";
import { Product } from "../products/entities/product.entity";
import { Order } from "../orders/entities/order.entity";
import { OrderItem } from "../orders/entities/order-item.entity";
import { StoreService } from "./store.service";
import { StoreController } from "./store.controller";
import { CustomerHomePersonalizationController } from "./customer-home-personalization.controller";
import { BannersModule } from "../banners/banners.module";
import { FoodCategoriesModule } from "../food-categories/food-categories.module";
import { OffersModule } from "../offers/offers.module";
import { BlogsModule } from "../blogs/blogs.module";

@Module({
  imports: [
    // Read-only cross-cutting discovery queries (popular/trending/nearby) — a legitimate case for
    // injecting these repositories directly rather than growing Restaurants/Products/Orders'
    // own services with storefront-specific ranking methods that aren't really their business logic.
    TypeOrmModule.forFeature([Restaurant, Product, Order, OrderItem]),
    BannersModule,
    FoodCategoriesModule,
    OffersModule,
    BlogsModule,
  ],
  controllers: [StoreController, CustomerHomePersonalizationController],
  providers: [StoreService],
})
export class StoreModule {}
