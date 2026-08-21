import { Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { CustomerGuard } from "../customers/guards/customer.guard";
import { NotificationsService } from "./notifications.service";

@ApiTags("Customer Self-Service - Notifications")
@UseGuards(CustomerGuard)
@Controller("customer/me/notifications")
export class CustomerNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Notifications fetched", data: await this.notificationsService.findAllForUser(user.userId) };
  }

  @Patch(":id/read")
  async markRead(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    return { message: "Notification marked read", data: await this.notificationsService.markRead(id, user.userId) };
  }
}
