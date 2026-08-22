import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { CustomerGuard } from "../customers/guards/customer.guard";
import { OrdersService } from "./orders.service";
import { CheckoutDto } from "./dto/checkout.dto";
import { CancelOrderDto } from "./dto/cancel-order.dto";

@ApiTags("Customer Self-Service - Orders")
@UseGuards(CustomerGuard)
@Controller("customer/me/orders")
export class CustomerOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post("checkout")
  async checkout(@CurrentUser() user: AuthenticatedUser, @Body() dto: CheckoutDto) {
    return { message: "Order placed", data: await this.ordersService.checkout(user.userId, dto.deliveryAddressId, dto.couponCode) };
  }

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Orders fetched", data: await this.ordersService.findAllForCustomer(user.userId) };
  }

  // Declared before ":id" — otherwise ParseUUIDPipe on that route would 400 this literal path first.
  @Get("delivery-fee-preview")
  async previewDeliveryFee(@CurrentUser() user: AuthenticatedUser, @Query("addressId", ParseUUIDPipe) addressId: string) {
    return { message: "Delivery fee estimated", data: await this.ordersService.previewDeliveryFee(user.userId, addressId) };
  }

  // Also declared before ":id" — same route-order rule.
  @Get("coupon-preview")
  async previewCoupon(@CurrentUser() user: AuthenticatedUser, @Query("code") code: string) {
    return { message: "Coupon validated", data: await this.ordersService.previewCoupon(user.userId, code) };
  }

  @Get(":id")
  async getOne(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    return { message: "Order fetched", data: await this.ordersService.findOneOrThrow(id, { customerId: user.userId }) };
  }

  @Patch(":id/cancel")
  async cancel(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: CancelOrderDto) {
    return { message: "Order cancelled", data: await this.ordersService.cancelByCustomer(id, user.userId, dto.reason) };
  }
}
