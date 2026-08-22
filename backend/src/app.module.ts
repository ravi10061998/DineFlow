import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ScheduleModule } from "@nestjs/schedule";
import { buildTypeOrmOptions } from "./config/typeorm.config";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { PermissionsGuard } from "./common/guards/permissions.guard";
import { UsersModule } from "./modules/users/users.module";
import { RolesModule } from "./modules/roles/roles.module";
import { AuthModule } from "./modules/auth/auth.module";
import { RestaurantsModule } from "./modules/restaurants/restaurants.module";
import { SubscriptionsModule } from "./modules/subscriptions/subscriptions.module";
import { CommissionModule } from "./modules/commission/commission.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { CategoriesModule } from "./modules/categories/categories.module";
import { ProductsModule } from "./modules/products/products.module";
import { CustomersModule } from "./modules/customers/customers.module";
import { AddressesModule } from "./modules/addresses/addresses.module";
import { CartModule } from "./modules/cart/cart.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { WebhooksModule } from "./modules/webhooks/webhooks.module";
import { RefundsModule } from "./modules/refunds/refunds.module";
import { LedgerModule } from "./modules/ledger/ledger.module";
import { FoodCategoriesModule } from "./modules/food-categories/food-categories.module";
import { BannersModule } from "./modules/banners/banners.module";
import { OffersModule } from "./modules/offers/offers.module";
import { BlogsModule } from "./modules/blogs/blogs.module";
import { FavoritesModule } from "./modules/favorites/favorites.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { StoreModule } from "./modules/store/store.module";
import { SettlementsModule } from "./modules/settlements/settlements.module";
import { PayoutsModule } from "./modules/payouts/payouts.module";
import { DeliveryPartnersModule } from "./modules/delivery-partners/delivery-partners.module";
import { AppController } from "./app.controller";

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: buildTypeOrmOptions,
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    UsersModule,
    RolesModule,
    AuthModule,
    RestaurantsModule,
    SubscriptionsModule,
    CommissionModule,
    DashboardModule,
    CategoriesModule,
    ProductsModule,
    CustomersModule,
    AddressesModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    WebhooksModule,
    RefundsModule,
    LedgerModule,
    FoodCategoriesModule,
    BannersModule,
    OffersModule,
    BlogsModule,
    FavoritesModule,
    NotificationsModule,
    StoreModule,
    SettlementsModule,
    PayoutsModule,
    DeliveryPartnersModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
