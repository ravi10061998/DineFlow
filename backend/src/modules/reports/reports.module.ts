import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Order } from "../orders/entities/order.entity";
import { ReportsService } from "./reports.service";
import { AdminReportsController } from "./admin-reports.controller";
import { RestaurantReportsController } from "./restaurant-reports.controller";
import { AnalyticsModule } from "../analytics/analytics.module";

@Module({
  imports: [TypeOrmModule.forFeature([Order]), AnalyticsModule],
  controllers: [AdminReportsController, RestaurantReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
