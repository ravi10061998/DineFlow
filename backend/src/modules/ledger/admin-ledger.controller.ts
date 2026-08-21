import { Controller, Get, Param, ParseUUIDPipe } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { LedgerService } from "./ledger.service";

@ApiTags("Admin - Ledger")
@Controller("admin/restaurants/:restaurantId/ledger")
export class AdminLedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get()
  @RequirePermissions("ledger:read")
  async getLedger(@Param("restaurantId", ParseUUIDPipe) restaurantId: string) {
    return { message: "Ledger fetched", data: await this.ledgerService.getForRestaurant(restaurantId) };
  }
}
