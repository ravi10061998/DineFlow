import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Payout } from "./entities/payout.entity";
import { PayoutsService } from "./payouts.service";
import { AdminPayoutsController } from "./admin-payouts.controller";
import { RestaurantPayoutsController } from "./restaurant-payouts.controller";
import { PAYOUT_GATEWAY } from "./gateways/payout-gateway.interface";
import { MockPayoutGateway } from "./gateways/mock-payout.gateway";

@Module({
  imports: [TypeOrmModule.forFeature([Payout])],
  controllers: [AdminPayoutsController, RestaurantPayoutsController],
  providers: [PayoutsService, { provide: PAYOUT_GATEWAY, useClass: MockPayoutGateway }],
  exports: [PayoutsService],
})
export class PayoutsModule {}
