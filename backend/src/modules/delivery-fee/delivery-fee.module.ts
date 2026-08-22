import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DeliveryFeeSettings } from "./entities/delivery-fee-settings.entity";
import { DeliveryFeeService } from "./delivery-fee.service";
import { AdminDeliveryFeeController } from "./admin-delivery-fee.controller";

@Module({
  imports: [TypeOrmModule.forFeature([DeliveryFeeSettings])],
  controllers: [AdminDeliveryFeeController],
  providers: [DeliveryFeeService],
  exports: [DeliveryFeeService],
})
export class DeliveryFeeModule {}
