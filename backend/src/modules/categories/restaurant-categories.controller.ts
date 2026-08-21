import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { RestaurantMemberGuard } from "../restaurants/guards/restaurant-member.guard";
import { CategoriesService } from "./categories.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { ReorderCategoriesDto } from "./dto/reorder-categories.dto";

@ApiTags("Restaurant Self-Service - Categories")
@UseGuards(RestaurantMemberGuard)
@Controller("restaurant/me/categories")
export class RestaurantCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Categories fetched", data: await this.categoriesService.findAllForRestaurant(user.restaurantId!) };
  }

  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCategoryDto) {
    return { message: "Category created", data: await this.categoriesService.create(user.restaurantId!, dto) };
  }

  @Put("reorder")
  async reorder(@CurrentUser() user: AuthenticatedUser, @Body() dto: ReorderCategoriesDto) {
    return { message: "Categories reordered", data: await this.categoriesService.reorder(user.restaurantId!, dto.orderedIds) };
  }

  @Patch(":id")
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return { message: "Category updated", data: await this.categoriesService.update(id, user.restaurantId!, dto) };
  }

  @Delete(":id")
  async remove(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    await this.categoriesService.remove(id, user.restaurantId!);
    return { message: "Category deleted", data: null };
  }
}
