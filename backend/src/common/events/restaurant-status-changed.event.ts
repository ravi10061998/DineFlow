import { RestaurantStatus } from "../../modules/restaurants/entities/restaurant.entity";

export const RESTAURANT_STATUS_CHANGED_EVENT = "restaurant.status_changed";

export class RestaurantStatusChangedEvent {
  constructor(
    public readonly restaurantId: string,
    public readonly fromStatus: RestaurantStatus,
    public readonly toStatus: RestaurantStatus,
    public readonly changedByUserId: string,
  ) {}
}
