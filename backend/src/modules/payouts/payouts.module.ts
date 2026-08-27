import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Payout } from "./entities/payout.entity";
import { PayoutsService } from "./payouts.service";
import { AdminPayoutsController } from "./admin-payouts.controller";
import { RestaurantPayoutsController } from "./restaurant-payouts.controller";
import { PAYOUT_GATEWAY } from "./gateways/payout-gateway.interface";
import { MockPayoutGateway } from "./gateways/mock-payout.gateway";
import { RazorpayXPayoutGateway } from "./gateways/razorpayx-payout.gateway";
import { RestaurantsModule } from "../restaurants/restaurants.module";
import { RestaurantBankAccountService } from "../restaurants/restaurant-bank-account.service";

@Module({
  imports: [TypeOrmModule.forFeature([Payout]), ConfigModule, RestaurantsModule],
  controllers: [AdminPayoutsController, RestaurantPayoutsController],
  providers: [
    PayoutsService,
    // Same runtime-chosen-gateway shape as PaymentsModule -- real RazorpayX the moment all three
    // env vars are set (it needs its own account number beyond the two Razorpay Payments needs),
    // MockPayoutGateway otherwise.
    {
      provide: PAYOUT_GATEWAY,
      useFactory: (configService: ConfigService, bankAccountService: RestaurantBankAccountService) => {
        if (
          configService.get<string>("RAZORPAY_KEY_ID") &&
          configService.get<string>("RAZORPAY_KEY_SECRET") &&
          configService.get<string>("RAZORPAYX_ACCOUNT_NUMBER")
        ) {
          return new RazorpayXPayoutGateway(configService, bankAccountService);
        }
        return new MockPayoutGateway();
      },
      inject: [ConfigService, RestaurantBankAccountService],
    },
  ],
  exports: [PayoutsService],
})
export class PayoutsModule {}
