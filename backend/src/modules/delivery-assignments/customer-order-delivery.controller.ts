import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { CustomerGuard } from "../customers/guards/customer.guard";
import { OrdersService } from "../orders/orders.service";
import { DeliveryAssignmentsService } from "./delivery-assignments.service";

@ApiTags("Customer Self-Service - Delivery Tracking")
@UseGuards(CustomerGuard)
@Controller("customer/me/orders/:orderId/delivery")
export class CustomerOrderDeliveryController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly assignmentsService: DeliveryAssignmentsService,
  ) {}

  @Get()
  async getDelivery(@Param("orderId", ParseUUIDPipe) orderId: string, @CurrentUser() user: AuthenticatedUser) {
    // findOneOrThrow's customerId scope 404s on any order that isn't the caller's own — no separate ownership check needed.
    await this.ordersService.findOneOrThrow(orderId, { customerId: user.userId });
    const assignment = await this.assignmentsService.findForOrder(orderId);
    return { message: "Delivery status fetched", data: assignment };
  }
}
