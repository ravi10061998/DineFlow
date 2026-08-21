import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Refund } from "./entities/refund.entity";
import { RefundsService } from "./refunds.service";
import { AdminRefundsController } from "./admin-refunds.controller";
import { OrdersModule } from "../orders/orders.module";
import { PaymentsModule } from "../payments/payments.module";

@Module({
  imports: [TypeOrmModule.forFeature([Refund]), OrdersModule, PaymentsModule],
  controllers: [AdminRefundsController],
  providers: [RefundsService],
})
export class RefundsModule {}
