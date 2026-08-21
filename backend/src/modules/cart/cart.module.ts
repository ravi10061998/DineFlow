import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CartItem } from "./entities/cart-item.entity";
import { CartService } from "./cart.service";
import { CartController } from "./cart.controller";
import { ProductsModule } from "../products/products.module";
import { RestaurantsModule } from "../restaurants/restaurants.module";

@Module({
  imports: [TypeOrmModule.forFeature([CartItem]), ProductsModule, RestaurantsModule],
  controllers: [CartController],
  providers: [CartService],
  // Exported for Orders' checkout flow to read the validated, live-priced cart it converts.
  exports: [CartService],
})
export class CartModule {}
