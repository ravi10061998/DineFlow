import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Offer } from "./entities/offer.entity";
import { OffersService } from "./offers.service";
import { PublicOffersController } from "./public-offers.controller";
import { AdminOffersController } from "./admin-offers.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Offer])],
  controllers: [PublicOffersController, AdminOffersController],
  providers: [OffersService],
  exports: [OffersService],
})
export class OffersModule {}
