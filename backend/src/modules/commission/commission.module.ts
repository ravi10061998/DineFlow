import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CommissionRule } from "./entities/commission-rule.entity";
import { CommissionService } from "./commission.service";
import { AdminCommissionController } from "./admin-commission.controller";
import { RestaurantCommissionController } from "./restaurant-commission.controller";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";

@Module({
  imports: [TypeOrmModule.forFeature([CommissionRule]), SubscriptionsModule],
  controllers: [AdminCommissionController, RestaurantCommissionController],
  providers: [CommissionService],
  exports: [CommissionService],
})
export class CommissionModule {}
