import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FoodCategory } from "./entities/food-category.entity";
import { FoodCategoriesService } from "./food-categories.service";
import { PublicFoodCategoriesController } from "./public-food-categories.controller";
import { AdminFoodCategoriesController } from "./admin-food-categories.controller";

@Module({
  imports: [TypeOrmModule.forFeature([FoodCategory])],
  controllers: [PublicFoodCategoriesController, AdminFoodCategoriesController],
  providers: [FoodCategoriesService],
  exports: [FoodCategoriesService],
})
export class FoodCategoriesModule {}
