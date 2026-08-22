import { Controller, Get, Query, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { OrderStatus } from "../orders/entities/order.entity";
import { ReportsService } from "./reports.service";

/** Reuses `analytics:read` — a CSV export is a different presentation of the same already-authorized data, not a new capability. */
@ApiTags("Admin - Reports")
@Controller("admin/reports")
@RequirePermissions("analytics:read")
export class AdminReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("orders.csv")
  async ordersCsv(@Res() res: Response, @Query("period") period?: string, @Query("status") status?: OrderStatus) {
    const csv = await this.reportsService.generateOrdersCsv({ period, status });
    this.sendCsv(res, csv, `orders-${period ?? "30d"}.csv`);
  }

  @Get("revenue.csv")
  async revenueCsv(@Res() res: Response, @Query("period") period?: string) {
    const csv = await this.reportsService.generateAdminRevenueCsv(period);
    this.sendCsv(res, csv, `revenue-${period ?? "30d"}.csv`);
  }

  private sendCsv(res: Response, csv: string, filename: string): void {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  }
}
