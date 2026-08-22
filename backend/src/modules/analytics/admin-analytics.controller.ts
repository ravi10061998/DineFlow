import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { AnalyticsService } from "./analytics.service";

@ApiTags("Admin - Analytics")
@Controller("admin/analytics")
@RequirePermissions("analytics:read")
export class AdminAnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("overview")
  async overview(@Query("period") period?: string) {
    return { message: "Analytics overview fetched", data: await this.analyticsService.getAdminOverview(period) };
  }

  @Get("revenue")
  async revenue(@Query("period") period?: string) {
    return { message: "Revenue time series fetched", data: await this.analyticsService.getAdminRevenueTimeSeries(period) };
  }

  @Get("top-restaurants")
  async topRestaurants(@Query("period") period?: string, @Query("limit") limit?: string) {
    return { message: "Top restaurants fetched", data: await this.analyticsService.getTopRestaurants(period, limit ? Number(limit) : undefined) };
  }

  @Get("top-products")
  async topProducts(@Query("period") period?: string, @Query("limit") limit?: string) {
    return { message: "Top products fetched", data: await this.analyticsService.getTopProducts(period, limit ? Number(limit) : undefined) };
  }
}
