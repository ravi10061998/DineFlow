import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { NotificationDispatchService } from "./notification-dispatch.service";

@ApiTags("Admin - Notification Deliveries")
@Controller("admin/notification-deliveries")
export class AdminNotificationDeliveriesController {
  constructor(private readonly dispatchService: NotificationDispatchService) {}

  @Get()
  @RequirePermissions("notification_deliveries:read")
  async list() {
    return { message: "Notification deliveries fetched", data: await this.dispatchService.findAllForAdmin() };
  }
}
