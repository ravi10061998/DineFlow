import type { RestaurantStatus } from "./types";
import type { SubscriptionStatus } from "./subscription-types";

export interface AdminDashboardSummary {
  totalRestaurants: number;
  restaurantsByStatus: Record<RestaurantStatus, number>;
  subscriptionsByStatus: Record<SubscriptionStatus, number>;
  activePlanCount: number;
}
