import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Product } from "./entities/product.entity";
import { ProductVariant } from "./entities/product-variant.entity";
import { ProductAddon } from "./entities/product-addon.entity";
import { ProductsService } from "./products.service";
import { ProductImagesService } from "./product-images.service";
import { RestaurantProductsController } from "./restaurant-products.controller";
import { AdminProductsController } from "./admin-products.controller";
import { CategoriesModule } from "../categories/categories.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductVariant, ProductAddon]),
    forwardRef(() => CategoriesModule),
  ],
  controllers: [RestaurantProductsController, AdminProductsController],
  providers: [ProductsService, ProductImagesService],
  exports: [ProductsService],
})
export class ProductsModule {}
