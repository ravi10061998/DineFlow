import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { RestaurantMemberGuard } from "../restaurants/guards/restaurant-member.guard";
import { CommissionService } from "./commission.service";

@ApiTags("Restaurant Self-Service - Commission")
@UseGuards(RestaurantMemberGuard)
@Controller("restaurant/me")
export class RestaurantCommissionController {
  constructor(private readonly commissionService: CommissionService) {}

  @Get("commission")
  async getMyCommission(@CurrentUser() user: AuthenticatedUser) {
    const effective = await this.commissionService.getEffectiveCommission(user.restaurantId!);
    return { message: "Commission rate fetched", data: effective };
  }
}
