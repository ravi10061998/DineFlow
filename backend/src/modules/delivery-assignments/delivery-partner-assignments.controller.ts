import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { DeliveryPartnerGuard } from "../delivery-partners/guards/delivery-partner.guard";
import { DeliveryAssignmentsService } from "./delivery-assignments.service";
import { DeliverDto } from "./dto/deliver.dto";

@ApiTags("Delivery Partner Self-Service - Assignments")
@UseGuards(DeliveryPartnerGuard)
@Controller("delivery-partner/me/assignments")
export class DeliveryPartnerAssignmentsController {
  constructor(private readonly assignmentsService: DeliveryAssignmentsService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Assignments fetched", data: await this.assignmentsService.findForPartnerUserId(user.userId) };
  }

  @Patch(":id/accept")
  async accept(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return { message: "Assignment accepted", data: await this.assignmentsService.accept(id, user.userId) };
  }

  @Patch(":id/reject")
  async reject(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return { message: "Assignment rejected", data: await this.assignmentsService.reject(id, user.userId) };
  }

  @Patch(":id/picked-up")
  async pickedUp(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return { message: "Marked as picked up", data: await this.assignmentsService.pickedUp(id, user.userId) };
  }

  @Patch(":id/deliver")
  async deliver(@Param("id", ParseUUIDPipe) id: string, @Body() dto: DeliverDto, @CurrentUser() user: AuthenticatedUser) {
    return { message: "Delivery confirmed", data: await this.assignmentsService.deliver(id, user.userId, dto.otp) };
  }
}
