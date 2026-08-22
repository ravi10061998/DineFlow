import { Controller, Get, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { PayoutsService } from "./payouts.service";

@ApiTags("Admin - Payouts")
@Controller("admin/payouts")
export class AdminPayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Get()
  @RequirePermissions("ledger:read")
  async list() {
    return { message: "Payouts fetched", data: await this.payoutsService.findAllForAdmin() };
  }

  @Post(":id/retry")
  @RequirePermissions("ledger:manage")
  async retry(@Param("id", ParseUUIDPipe) id: string) {
    return { message: "Payout retried", data: await this.payoutsService.retry(id) };
  }
}
