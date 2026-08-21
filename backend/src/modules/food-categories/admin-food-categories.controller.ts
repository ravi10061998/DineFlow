import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { FoodCategoriesService } from "./food-categories.service";
import { CreateFoodCategoryDto } from "./dto/create-food-category.dto";
import { UpdateFoodCategoryDto } from "./dto/update-food-category.dto";

@ApiTags("Admin - Food Categories")
@Controller("admin/food-categories")
export class AdminFoodCategoriesController {
  constructor(private readonly foodCategoriesService: FoodCategoriesService) {}

  @Get()
  @RequirePermissions("content:read")
  async list() {
    return { message: "Categories fetched", data: await this.foodCategoriesService.findAllForAdmin() };
  }

  @Post()
  @RequirePermissions("content:manage")
  async create(@Body() dto: CreateFoodCategoryDto) {
    return { message: "Category created", data: await this.foodCategoriesService.create(dto) };
  }

  @Patch(":id")
  @RequirePermissions("content:manage")
  async update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateFoodCategoryDto) {
    return { message: "Category updated", data: await this.foodCategoriesService.update(id, dto) };
  }

  @Delete(":id")
  @RequirePermissions("content:manage")
  async remove(@Param("id", ParseUUIDPipe) id: string) {
    await this.foodCategoriesService.remove(id);
    return { message: "Category deleted", data: null };
  }
}
