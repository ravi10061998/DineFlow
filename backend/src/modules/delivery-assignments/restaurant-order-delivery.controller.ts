import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { RestaurantMemberGuard } from "../restaurants/guards/restaurant-member.guard";
import { OrdersService } from "../orders/orders.service";
import { DeliveryAssignmentsService } from "./delivery-assignments.service";

@ApiTags("Restaurant Self-Service - Delivery Tracking")
@UseGuards(RestaurantMemberGuard)
@Controller("restaurant/me/orders/:orderId/delivery")
export class RestaurantOrderDeliveryController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly assignmentsService: DeliveryAssignmentsService,
  ) {}

  @Get()
  async getDelivery(@Param("orderId", ParseUUIDPipe) orderId: string, @CurrentUser() user: AuthenticatedUser) {
    const order = await this.ordersService.findOneOrThrow(orderId, { restaurantId: user.restaurantId! });
    const assignment = await this.assignmentsService.findForOrderWithDistance(orderId, order.deliveryLatitude, order.deliveryLongitude);
    return { message: "Delivery status fetched", data: assignment };
  }
}
