import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../../common/decorators/public.decorator";
import { FoodCategoriesService } from "./food-categories.service";

@ApiTags("Public - Storefront")
@Public()
@Controller("store/categories")
export class PublicFoodCategoriesController {
  constructor(private readonly foodCategoriesService: FoodCategoriesService) {}

  @Get()
  async list() {
    return { message: "Categories fetched", data: await this.foodCategoriesService.findActiveForStore() };
  }
}
