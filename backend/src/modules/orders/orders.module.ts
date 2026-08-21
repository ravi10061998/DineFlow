import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Order } from "./entities/order.entity";
import { OrderItem } from "./entities/order-item.entity";
import { OrderStatusHistory } from "./entities/order-status-history.entity";
import { OrdersService } from "./orders.service";
import { CustomerOrdersController } from "./customer-orders.controller";
import { RestaurantOrdersController } from "./restaurant-orders.controller";
import { AdminOrdersController } from "./admin-orders.controller";
import { CartModule } from "../cart/cart.module";
import { AddressesModule } from "../addresses/addresses.module";
import { CommissionModule } from "../commission/commission.module";

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, OrderStatusHistory]), CartModule, AddressesModule, CommissionModule],
  controllers: [CustomerOrdersController, RestaurantOrdersController, AdminOrdersController],
  providers: [OrdersService],
  // Exported so Payments can look up an order (ownership + current status) as part of its own flow.
  exports: [OrdersService],
})
export class OrdersModule {}
