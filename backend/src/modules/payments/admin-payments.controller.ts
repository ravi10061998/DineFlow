import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { PaymentsService } from "./payments.service";

@ApiTags("Admin - Payments")
@Controller("admin/payments")
export class AdminPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @RequirePermissions("payments:read")
  async list() {
    return { message: "Payments fetched", data: await this.paymentsService.findAllForAdmin() };
  }
}
