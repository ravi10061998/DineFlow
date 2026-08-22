import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { CurrentUser, AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { DeliveryPartnersService } from "./delivery-partners.service";
import { DeliveryPartnerStatus } from "./entities/delivery-partner.entity";
import { StatusChangeReasonDto } from "../restaurants/dto/status-change-reason.dto";

@ApiTags("Admin - Delivery Partners")
@Controller("admin/delivery-partners")
export class AdminDeliveryPartnersController {
  constructor(private readonly partnersService: DeliveryPartnersService) {}

  @Get()
  @RequirePermissions("delivery_partners:read")
  async list(@Query("status") status?: DeliveryPartnerStatus) {
    return { message: "Delivery partners fetched", data: await this.partnersService.findAll(status) };
  }

  @Get(":id")
  @RequirePermissions("delivery_partners:read")
  async getOne(@Param("id", ParseUUIDPipe) id: string) {
    return { message: "Delivery partner fetched", data: await this.partnersService.findByIdOrThrow(id) };
  }

  @Get(":id/status-history")
  @RequirePermissions("delivery_partners:read")
  async getStatusHistory(@Param("id", ParseUUIDPipe) id: string) {
    return { message: "Status history fetched", data: await this.partnersService.getStatusHistory(id) };
  }

  @Patch(":id/approve")
  @RequirePermissions("delivery_partners:approve")
  async approve(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() admin: AuthenticatedUser) {
    return { message: "Delivery partner approved", data: await this.partnersService.approve(id, admin.userId) };
  }

  @Patch(":id/reject")
  @RequirePermissions("delivery_partners:approve")
  async reject(@Param("id", ParseUUIDPipe) id: string, @Body() dto: StatusChangeReasonDto, @CurrentUser() admin: AuthenticatedUser) {
    return { message: "Delivery partner rejected", data: await this.partnersService.reject(id, admin.userId, dto.reason) };
  }

  @Patch(":id/suspend")
  @RequirePermissions("delivery_partners:manage")
  async suspend(@Param("id", ParseUUIDPipe) id: string, @Body() dto: StatusChangeReasonDto, @CurrentUser() admin: AuthenticatedUser) {
    return { message: "Delivery partner suspended", data: await this.partnersService.suspend(id, admin.userId, dto.reason) };
  }

  @Patch(":id/block")
  @RequirePermissions("delivery_partners:manage")
  async block(@Param("id", ParseUUIDPipe) id: string, @Body() dto: StatusChangeReasonDto, @CurrentUser() admin: AuthenticatedUser) {
    return { message: "Delivery partner blocked", data: await this.partnersService.block(id, admin.userId, dto.reason) };
  }

  @Patch(":id/reinstate")
  @RequirePermissions("delivery_partners:manage")
  async reinstate(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() admin: AuthenticatedUser) {
    return { message: "Delivery partner reinstated", data: await this.partnersService.reinstate(id, admin.userId) };
  }

  @Patch(":id/resubmit")
  @RequirePermissions("delivery_partners:approve")
  async resubmit(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() admin: AuthenticatedUser) {
    return { message: "Delivery partner moved back to pending review", data: await this.partnersService.resubmit(id, admin.userId) };
  }
}
