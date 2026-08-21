import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LedgerEntry } from "./entities/ledger-entry.entity";
import { LedgerService } from "./ledger.service";
import { RestaurantLedgerController } from "./restaurant-ledger.controller";
import { AdminLedgerController } from "./admin-ledger.controller";
import { OrdersModule } from "../orders/orders.module";

@Module({
  imports: [TypeOrmModule.forFeature([LedgerEntry]), OrdersModule],
  controllers: [RestaurantLedgerController, AdminLedgerController],
  providers: [LedgerService],
})
export class LedgerModule {}
