import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CustomerAddress } from "./entities/customer-address.entity";
import { AddressesService } from "./addresses.service";
import { CustomerAddressesController } from "./customer-addresses.controller";

@Module({
  imports: [TypeOrmModule.forFeature([CustomerAddress])],
  controllers: [CustomerAddressesController],
  providers: [AddressesService],
  // Exported so a later Cart/Orders/Delivery module can resolve a customer's
  // default/selected address without duplicating this lookup logic.
  exports: [AddressesService],
})
export class AddressesModule {}
