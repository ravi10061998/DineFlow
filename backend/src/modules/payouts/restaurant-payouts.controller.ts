import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { RestaurantMemberGuard } from "../restaurants/guards/restaurant-member.guard";
import { PayoutsService } from "./payouts.service";

@ApiTags("Restaurant Self-Service - Payouts")
@UseGuards(RestaurantMemberGuard)
@Controller("restaurant/me/payouts")
export class RestaurantPayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Payouts fetched", data: await this.payoutsService.findAllForRestaurant(user.restaurantId!) };
  }
}
