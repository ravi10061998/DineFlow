import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Restaurant } from "./entities/restaurant.entity";
import { RestaurantDocument } from "./entities/restaurant-document.entity";
import { RestaurantBusinessHours } from "./entities/restaurant-business-hours.entity";
import { RestaurantHoliday } from "./entities/restaurant-holiday.entity";
import { RestaurantStatusHistory } from "./entities/restaurant-status-history.entity";
import { RestaurantBankAccount } from "./entities/restaurant-bank-account.entity";
import { RestaurantsService } from "./restaurants.service";
import { RestaurantDocumentsService } from "./restaurant-documents.service";
import { RestaurantLogoService } from "./restaurant-logo.service";
import { RestaurantBankAccountService } from "./restaurant-bank-account.service";
import { RestaurantRegistrationController } from "./restaurant-registration.controller";
import { RestaurantSelfServiceController } from "./restaurant-self-service.controller";
import { AdminRestaurantsController } from "./admin-restaurants.controller";
import { PublicRestaurantsController } from "./public-restaurants.controller";
import { UsersModule } from "../users/users.module";
import { RolesModule } from "../roles/roles.module";
import { AuthModule } from "../auth/auth.module";
import { ReviewsModule } from "../reviews/reviews.module";
import { StorageModule } from "../../common/storage/storage.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Restaurant,
      RestaurantDocument,
      RestaurantBusinessHours,
      RestaurantHoliday,
      RestaurantStatusHistory,
      RestaurantBankAccount,
    ]),
    UsersModule,
    RolesModule,
    AuthModule,
    ReviewsModule,
    StorageModule,
  ],
  controllers: [
    RestaurantRegistrationController,
    RestaurantSelfServiceController,
    AdminRestaurantsController,
    PublicRestaurantsController,
  ],
  providers: [RestaurantsService, RestaurantDocumentsService, RestaurantLogoService, RestaurantBankAccountService],
  // RestaurantBankAccountService: so PayoutsModule's RazorpayXPayoutGateway can look up a
  // restaurant's verified bank details without RestaurantsModule depending back on Payouts.
  exports: [RestaurantsService, RestaurantDocumentsService, RestaurantLogoService, RestaurantBankAccountService],
})
export class RestaurantsModule {}
