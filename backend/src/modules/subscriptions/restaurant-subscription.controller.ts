import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { RestaurantMemberGuard } from "../restaurants/guards/restaurant-member.guard";
import { SubscriptionsService } from "./subscriptions.service";
import { SubscribeDto } from "./dto/subscribe.dto";

@ApiTags("Restaurant Self-Service - Subscription")
@UseGuards(RestaurantMemberGuard)
@Controller("restaurant/me")
export class RestaurantSubscriptionController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get("subscription")
  async getSubscription(@CurrentUser() user: AuthenticatedUser) {
    const subscription = await this.subscriptionsService.findForRestaurantOrNull(user.restaurantId!);
    return { message: "Subscription fetched", data: subscription };
  }

  @Get("subscription/events")
  async getEvents(@CurrentUser() user: AuthenticatedUser) {
    const events = await this.subscriptionsService.getEventsForRestaurant(user.restaurantId!);
    return { message: "Subscription events fetched", data: events };
  }

  @Get("available-plans")
  async getAvailablePlans() {
    const plans = await this.subscriptionsService.findAllPlans(false);
    return { message: "Available plans fetched", data: plans };
  }

  @Post("subscription/subscribe")
  async subscribe(@CurrentUser() user: AuthenticatedUser, @Body() dto: SubscribeDto) {
    const subscription = await this.subscriptionsService.subscribe(user.restaurantId!, dto.planId);
    return { message: "Subscribed", data: subscription };
  }

  @Post("subscription/cancel")
  async cancel(@CurrentUser() user: AuthenticatedUser) {
    const subscription = await this.subscriptionsService.cancel(user.restaurantId!);
    return { message: "Subscription cancelled", data: subscription };
  }
}
