import { Controller, Get, Param, ParseUUIDPipe } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { CategoriesService } from "./categories.service";

@ApiTags("Admin - Categories")
@Controller("admin/restaurants/:restaurantId/categories")
export class AdminCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @RequirePermissions("categories:read")
  async list(@Param("restaurantId", ParseUUIDPipe) restaurantId: string) {
    return { message: "Categories fetched", data: await this.categoriesService.findAllForRestaurant(restaurantId) };
  }
}
