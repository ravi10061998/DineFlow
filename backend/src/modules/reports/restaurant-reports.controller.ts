import { Controller, Get, Query, Res, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { CurrentUser, AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { RestaurantMemberGuard } from "../restaurants/guards/restaurant-member.guard";
import { OrderStatus } from "../orders/entities/order.entity";
import { ReportsService } from "./reports.service";

@ApiTags("Restaurant Self-Service - Reports")
@UseGuards(RestaurantMemberGuard)
@Controller("restaurant/me/reports")
export class RestaurantReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("orders.csv")
  async ordersCsv(@CurrentUser() user: AuthenticatedUser, @Res() res: Response, @Query("period") period?: string, @Query("status") status?: OrderStatus) {
    const csv = await this.reportsService.generateOrdersCsv({ restaurantId: user.restaurantId!, period, status });
    this.sendCsv(res, csv, `my-orders-${period ?? "30d"}.csv`);
  }

  @Get("revenue.csv")
  async revenueCsv(@CurrentUser() user: AuthenticatedUser, @Res() res: Response, @Query("period") period?: string) {
    const csv = await this.reportsService.generateRestaurantRevenueCsv(user.restaurantId!, period);
    this.sendCsv(res, csv, `my-revenue-${period ?? "30d"}.csv`);
  }

  private sendCsv(res: Response, csv: string, filename: string): void {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  }
}
