import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { RestaurantMemberGuard } from "../restaurants/guards/restaurant-member.guard";
import { LedgerService } from "./ledger.service";

@ApiTags("Restaurant Self-Service - Ledger")
@UseGuards(RestaurantMemberGuard)
@Controller("restaurant/me/ledger")
export class RestaurantLedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get()
  async getLedger(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Ledger fetched", data: await this.ledgerService.getForRestaurant(user.restaurantId!) };
  }
}
