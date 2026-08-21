import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Category } from "./entities/category.entity";
import { CategoriesService } from "./categories.service";
import { RestaurantCategoriesController } from "./restaurant-categories.controller";
import { AdminCategoriesController } from "./admin-categories.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Category])],
  controllers: [RestaurantCategoriesController, AdminCategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
