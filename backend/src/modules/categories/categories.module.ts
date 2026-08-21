import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Category } from "./entities/category.entity";
import { CategoriesService } from "./categories.service";
import { RestaurantCategoriesController } from "./restaurant-categories.controller";
import { AdminCategoriesController } from "./admin-categories.controller";
import { ProductsModule } from "../products/products.module";

@Module({
  imports: [TypeOrmModule.forFeature([Category]), forwardRef(() => ProductsModule)],
  controllers: [RestaurantCategoriesController, AdminCategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
