import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Payment } from "./entities/payment.entity";
import { PaymentsService } from "./payments.service";
import { CustomerPaymentsController } from "./customer-payments.controller";
import { AdminPaymentsController } from "./admin-payments.controller";
import { MockPaymentGateway } from "./gateways/mock-payment.gateway";
import { PAYMENT_GATEWAY } from "./gateways/payment-gateway.interface";
import { OrdersModule } from "../orders/orders.module";

@Module({
  imports: [TypeOrmModule.forFeature([Payment]), OrdersModule],
  controllers: [CustomerPaymentsController, AdminPaymentsController],
  providers: [PaymentsService, MockPaymentGateway, { provide: PAYMENT_GATEWAY, useExisting: MockPaymentGateway }],
  // PaymentsService: so Webhooks/Refunds can apply a gateway-reported outcome without duplicating
  // the payment+order transactional update logic that already lives in verify().
  // PAYMENT_GATEWAY: so Refunds can call gateway.refund() directly, the same DI token this
  // module itself uses — one place decides which concrete gateway is wired up.
  exports: [PaymentsService, PAYMENT_GATEWAY],
})
export class PaymentsModule {}
