import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DeliveryAssignment } from "./entities/delivery-assignment.entity";
import { DeliveryPartner } from "../delivery-partners/entities/delivery-partner.entity";
import { DeliveryAssignmentsService } from "./delivery-assignments.service";
import { DeliveryPartnerAssignmentsController } from "./delivery-partner-assignments.controller";
import { CustomerOrderDeliveryController } from "./customer-order-delivery.controller";
import { RestaurantOrderDeliveryController } from "./restaurant-order-delivery.controller";
import { AdminDeliveryAssignmentsController } from "./admin-delivery-assignments.controller";
import { OrdersModule } from "../orders/orders.module";
import { RestaurantsModule } from "../restaurants/restaurants.module";

@Module({
  // TypeOrmModule.forFeature([DeliveryPartner]) here is the same legitimate cross-cutting
  // read pattern Module 16's StoreModule used — this module reads delivery partners
  // directly for assignment matching without needing DeliveryPartnersService's full API.
  imports: [TypeOrmModule.forFeature([DeliveryAssignment, DeliveryPartner]), OrdersModule, RestaurantsModule],
  controllers: [
    DeliveryPartnerAssignmentsController,
    CustomerOrderDeliveryController,
    RestaurantOrderDeliveryController,
    AdminDeliveryAssignmentsController,
  ],
  providers: [DeliveryAssignmentsService],
  exports: [DeliveryAssignmentsService],
})
export class DeliveryAssignmentsModule {}
