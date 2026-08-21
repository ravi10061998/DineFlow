import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { RefundsService } from "./refunds.service";

/** Reuses payments:read — refunds are payment-domain financial records, not a separate resource. */
@ApiTags("Admin - Refunds")
@Controller("admin/refunds")
export class AdminRefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Get()
  @RequirePermissions("payments:read")
  async list() {
    return { message: "Refunds fetched", data: await this.refundsService.findAllForAdmin() };
  }
}
