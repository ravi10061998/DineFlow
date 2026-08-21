import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { RestaurantsService } from "../restaurants/restaurants.service";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";

/**
 * A first slice of the spec's §3 admin dashboard — only the metrics that are
 * actually computable from modules that exist so far (restaurants,
 * subscriptions). Revenue/order/delivery/payout figures wait for their
 * respective modules; this endpoint should grow incrementally alongside them
 * rather than becoming a dedicated Analytics module prematurely.
 */
@ApiTags("Admin - Dashboard")
@Controller("admin/dashboard")
export class AdminDashboardController {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Get("summary")
  @RequirePermissions("restaurants:read")
  async getSummary() {
    const [restaurantsByStatus, subscriptionsByStatus, activePlanCount] = await Promise.all([
      this.restaurantsService.countByStatus(),
      this.subscriptionsService.countSubscriptionsByStatus(),
      this.subscriptionsService.countActivePlans(),
    ]);

    const totalRestaurants = Object.values(restaurantsByStatus).reduce((sum, n) => sum + n, 0);

    return {
      message: "Dashboard summary fetched",
      data: {
        totalRestaurants,
        restaurantsByStatus,
        subscriptionsByStatus,
        activePlanCount,
      },
    };
  }
}
