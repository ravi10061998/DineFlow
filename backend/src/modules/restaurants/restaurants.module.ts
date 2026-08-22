import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Restaurant } from "./entities/restaurant.entity";
import { RestaurantDocument } from "./entities/restaurant-document.entity";
import { RestaurantBusinessHours } from "./entities/restaurant-business-hours.entity";
import { RestaurantHoliday } from "./entities/restaurant-holiday.entity";
import { RestaurantStatusHistory } from "./entities/restaurant-status-history.entity";
import { RestaurantsService } from "./restaurants.service";
import { RestaurantDocumentsService } from "./restaurant-documents.service";
import { RestaurantLogoService } from "./restaurant-logo.service";
import { RestaurantRegistrationController } from "./restaurant-registration.controller";
import { RestaurantSelfServiceController } from "./restaurant-self-service.controller";
import { AdminRestaurantsController } from "./admin-restaurants.controller";
import { PublicRestaurantsController } from "./public-restaurants.controller";
import { UsersModule } from "../users/users.module";
import { RolesModule } from "../roles/roles.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Restaurant,
      RestaurantDocument,
      RestaurantBusinessHours,
      RestaurantHoliday,
      RestaurantStatusHistory,
    ]),
    UsersModule,
    RolesModule,
    AuthModule,
  ],
  controllers: [
    RestaurantRegistrationController,
    RestaurantSelfServiceController,
    AdminRestaurantsController,
    PublicRestaurantsController,
  ],
  providers: [RestaurantsService, RestaurantDocumentsService, RestaurantLogoService],
  exports: [RestaurantsService, RestaurantDocumentsService, RestaurantLogoService],
})
export class RestaurantsModule {}
