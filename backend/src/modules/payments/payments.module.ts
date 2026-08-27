import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Payment } from "./entities/payment.entity";
import { PaymentsService } from "./payments.service";
import { CustomerPaymentsController } from "./customer-payments.controller";
import { AdminPaymentsController } from "./admin-payments.controller";
import { MockPaymentGateway } from "./gateways/mock-payment.gateway";
import { RazorpayPaymentGateway } from "./gateways/razorpay-payment.gateway";
import { PAYMENT_GATEWAY } from "./gateways/payment-gateway.interface";
import { OrdersModule } from "../orders/orders.module";

@Module({
  imports: [TypeOrmModule.forFeature([Payment]), OrdersModule, ConfigModule],
  controllers: [CustomerPaymentsController, AdminPaymentsController],
  providers: [
    PaymentsService,
    // Always provided, regardless of which gateway is active -- PaymentsService's mockComplete()
    // (the dev "simulate payment" endpoint) injects this directly, not through the PAYMENT_GATEWAY
    // token, so it keeps working for local testing even once a real gateway is configured.
    MockPaymentGateway,
    // The first payment gateway in this app actually chosen at runtime rather than hardcoded to
    // Mock -- same StorageModule-style factory: real Razorpay the moment both env vars are set,
    // the mock otherwise. Swapping in a DIFFERENT real gateway later (Stripe, say) means adding
    // one more branch here, not touching PaymentsService/RefundsService/Webhooks at all.
    {
      provide: PAYMENT_GATEWAY,
      useFactory: (configService: ConfigService, mockGateway: MockPaymentGateway) => {
        if (configService.get<string>("RAZORPAY_KEY_ID") && configService.get<string>("RAZORPAY_KEY_SECRET")) {
          return new RazorpayPaymentGateway(configService);
        }
        return mockGateway;
      },
      inject: [ConfigService, MockPaymentGateway],
    },
  ],
  // PaymentsService: so Webhooks/Refunds can apply a gateway-reported outcome without duplicating
  // the payment+order transactional update logic that already lives in verify().
  // PAYMENT_GATEWAY: so Refunds can call gateway.refund() directly, the same DI token this
  // module itself uses — one place decides which concrete gateway is wired up.
  exports: [PaymentsService, PAYMENT_GATEWAY],
})
export class PaymentsModule {}
