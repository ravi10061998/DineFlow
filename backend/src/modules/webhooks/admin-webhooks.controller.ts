import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { WebhooksService } from "./webhooks.service";

/** Reuses payments:read — webhook deliveries are payment-domain infrastructure, not a separate resource. */
@ApiTags("Admin - Webhooks")
@Controller("admin/webhooks")
export class AdminWebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get()
  @RequirePermissions("payments:read")
  async list() {
    return { message: "Webhook events fetched", data: await this.webhooksService.findAllForAdmin() };
  }
}
