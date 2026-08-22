import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Coupon } from "./entities/coupon.entity";
import { CouponRedemption } from "./entities/coupon-redemption.entity";
import { CouponsService } from "./coupons.service";
import { AdminCouponsController } from "./admin-coupons.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Coupon, CouponRedemption])],
  controllers: [AdminCouponsController],
  providers: [CouponsService],
  // Exported so Orders can validate+lock+redeem a coupon inside its own checkout transaction.
  exports: [CouponsService],
})
export class CouponsModule {}
