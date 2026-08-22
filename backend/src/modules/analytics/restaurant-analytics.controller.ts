import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { RestaurantMemberGuard } from "../restaurants/guards/restaurant-member.guard";
import { AnalyticsService } from "./analytics.service";

@ApiTags("Restaurant Self-Service - Analytics")
@UseGuards(RestaurantMemberGuard)
@Controller("restaurant/me/analytics")
export class RestaurantAnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("overview")
  async overview(@CurrentUser() user: AuthenticatedUser, @Query("period") period?: string) {
    return { message: "Analytics overview fetched", data: await this.analyticsService.getRestaurantOverview(user.restaurantId!, period) };
  }

  @Get("revenue")
  async revenue(@CurrentUser() user: AuthenticatedUser, @Query("period") period?: string) {
    return { message: "Revenue time series fetched", data: await this.analyticsService.getRestaurantRevenueTimeSeries(user.restaurantId!, period) };
  }

  @Get("top-products")
  async topProducts(@CurrentUser() user: AuthenticatedUser, @Query("period") period?: string, @Query("limit") limit?: string) {
    return {
      message: "Top products fetched",
      data: await this.analyticsService.getRestaurantTopProducts(user.restaurantId!, period, limit ? Number(limit) : undefined),
    };
  }
}
