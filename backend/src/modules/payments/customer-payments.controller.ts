import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { CustomerGuard } from "../customers/guards/customer.guard";
import { PaymentsService } from "./payments.service";
import { VerifyPaymentDto } from "./dto/verify-payment.dto";
import { MockCompleteDto } from "./dto/mock-complete.dto";

@ApiTags("Customer Self-Service - Payments")
@UseGuards(CustomerGuard)
@Controller("customer/me/orders/:orderId/payment")
export class CustomerPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post("initiate")
  async initiate(@CurrentUser() user: AuthenticatedUser, @Param("orderId", ParseUUIDPipe) orderId: string) {
    const { payment, gatewayKeyId } = await this.paymentsService.initiate(orderId, user.userId);
    return {
      message: "Payment initiated",
      data: {
        paymentId: payment.id,
        gatewayOrderId: payment.gatewayOrderId,
        amount: payment.amount,
        currency: payment.currency,
        gatewayKeyId,
      },
    };
  }

  @Post("verify")
  async verify(@CurrentUser() user: AuthenticatedUser, @Param("orderId", ParseUUIDPipe) orderId: string, @Body() dto: VerifyPaymentDto) {
    return { message: "Payment verified", data: await this.paymentsService.verify(orderId, user.userId, dto) };
  }

  /**
   * Dev/demo-only: stands in for a real gateway's hosted checkout widget,
   * which no browser here can redirect to since there's no real gateway
   * configured. Delete this route (not the service methods it calls) when
   * wiring up a real gateway's client-side checkout instead.
   */
  @Post("mock-complete")
  async mockComplete(@CurrentUser() user: AuthenticatedUser, @Param("orderId", ParseUUIDPipe) orderId: string, @Body() dto: MockCompleteDto) {
    return { message: "Payment simulated", data: await this.paymentsService.mockComplete(orderId, user.userId, dto.paymentId, dto.succeed) };
  }

  @Get()
  async getLatest(@CurrentUser() user: AuthenticatedUser, @Param("orderId", ParseUUIDPipe) orderId: string) {
    return { message: "Payment fetched", data: await this.paymentsService.getLatestForOrder(orderId, user.userId) };
  }
}
