import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { RestaurantMemberGuard } from "../restaurants/guards/restaurant-member.guard";
import { OrdersService } from "./orders.service";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";
import { CancelOrderDto } from "./dto/cancel-order.dto";

@ApiTags("Restaurant Self-Service - Orders")
@UseGuards(RestaurantMemberGuard)
@Controller("restaurant/me/orders")
export class RestaurantOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Orders fetched", data: await this.ordersService.findAllForRestaurant(user.restaurantId!) };
  }

  @Get(":id")
  async getOne(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    return { message: "Order fetched", data: await this.ordersService.findOneOrThrow(id, { restaurantId: user.restaurantId! }) };
  }

  @Patch(":id/status")
  async updateStatus(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateOrderStatusDto) {
    const data = await this.ordersService.updateStatusByRestaurant(id, user.restaurantId!, dto.status, user.userId);
    return { message: "Order status updated", data };
  }

  @Patch(":id/cancel")
  async cancel(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: CancelOrderDto) {
    const data = await this.ordersService.cancelByRestaurant(id, user.restaurantId!, dto.reason ?? "Cancelled by restaurant", user.userId);
    return { message: "Order cancelled", data };
  }
}
