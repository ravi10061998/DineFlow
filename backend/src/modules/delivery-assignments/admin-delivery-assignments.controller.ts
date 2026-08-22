import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { DeliveryAssignmentsService } from "./delivery-assignments.service";

@ApiTags("Admin - Delivery Assignments")
@Controller("admin/delivery-assignments")
export class AdminDeliveryAssignmentsController {
  constructor(private readonly assignmentsService: DeliveryAssignmentsService) {}

  @Get()
  @RequirePermissions("delivery_assignments:read")
  async list() {
    return { message: "Delivery assignments fetched", data: await this.assignmentsService.findAllForAdmin() };
  }
}
