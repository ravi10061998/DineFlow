import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { CustomerGuard } from "../customers/guards/customer.guard";
import { FavoritesService } from "./favorites.service";
import { CreateFavoriteDto } from "./dto/create-favorite.dto";

@ApiTags("Customer Self-Service - Favorites")
@UseGuards(CustomerGuard)
@Controller("customer/me/favorites")
export class CustomerFavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Favorites fetched", data: await this.favoritesService.findAllForUser(user.userId) };
  }

  @Post()
  async add(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateFavoriteDto) {
    return { message: "Added to favorites", data: await this.favoritesService.add(user.userId, dto) };
  }

  @Delete(":id")
  async remove(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    await this.favoritesService.remove(id, user.userId);
    return { message: "Removed from favorites", data: null };
  }
}
