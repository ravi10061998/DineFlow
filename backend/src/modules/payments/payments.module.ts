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
})
export class PaymentsModule {}
