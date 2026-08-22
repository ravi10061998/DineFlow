import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Settlement } from "./entities/settlement.entity";
import { LedgerEntry } from "../ledger/entities/ledger-entry.entity";
import { SettlementsService } from "./settlements.service";
import { AdminSettlementsController } from "./admin-settlements.controller";
import { RestaurantSettlementsController } from "./restaurant-settlements.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Settlement, LedgerEntry])],
  controllers: [AdminSettlementsController, RestaurantSettlementsController],
  providers: [SettlementsService],
  exports: [SettlementsService],
})
export class SettlementsModule {}
