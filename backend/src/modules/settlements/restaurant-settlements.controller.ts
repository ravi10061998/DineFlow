import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { RestaurantMemberGuard } from "../restaurants/guards/restaurant-member.guard";
import { SettlementsService } from "./settlements.service";

@ApiTags("Restaurant Self-Service - Settlements")
@UseGuards(RestaurantMemberGuard)
@Controller("restaurant/me/settlements")
export class RestaurantSettlementsController {
  constructor(private readonly settlementsService: SettlementsService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Settlements fetched", data: await this.settlementsService.findAllForRestaurant(user.restaurantId!) };
  }
}
