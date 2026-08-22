import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DeliveryPartner } from "./entities/delivery-partner.entity";
import { DeliveryPartnerStatusHistory } from "./entities/delivery-partner-status-history.entity";
import { DeliveryPartnersService } from "./delivery-partners.service";
import { DeliveryPartnerRegistrationController } from "./delivery-partner-registration.controller";
import { DeliveryPartnerSelfServiceController } from "./delivery-partner-self-service.controller";
import { AdminDeliveryPartnersController } from "./admin-delivery-partners.controller";
import { UsersModule } from "../users/users.module";
import { RolesModule } from "../roles/roles.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [TypeOrmModule.forFeature([DeliveryPartner, DeliveryPartnerStatusHistory]), UsersModule, RolesModule, AuthModule],
  controllers: [DeliveryPartnerRegistrationController, DeliveryPartnerSelfServiceController, AdminDeliveryPartnersController],
  providers: [DeliveryPartnersService],
  exports: [DeliveryPartnersService],
})
export class DeliveryPartnersModule {}
