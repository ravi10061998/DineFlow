import { Controller, Get, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { SettlementsService } from "./settlements.service";

@ApiTags("Admin - Settlements")
@Controller("admin")
export class AdminSettlementsController {
  constructor(private readonly settlementsService: SettlementsService) {}

  @Get("settlements")
  @RequirePermissions("ledger:read")
  async list() {
    return { message: "Settlements fetched", data: await this.settlementsService.findAllForAdmin() };
  }

  @Post("restaurants/:restaurantId/settlements/run")
  @RequirePermissions("ledger:manage")
  async runForRestaurant(@Param("restaurantId", ParseUUIDPipe) restaurantId: string) {
    const settlement = await this.settlementsService.runForRestaurant(restaurantId);
    return {
      message: settlement ? "Settlement created" : "Nothing to settle — no unsettled ledger balance",
      data: settlement,
    };
  }

  @Post("settlements/run-all")
  @RequirePermissions("ledger:manage")
  async runAll() {
    const settlements = await this.settlementsService.runForAllRestaurants();
    return { message: `${settlements.length} settlement(s) created`, data: settlements };
  }
}
