import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { CustomerGuard } from "../customers/guards/customer.guard";
import { StoreService } from "./store.service";

/**
 * Split from the public /store/home aggregate on purpose: the global
 * JwtAuthGuard skips the passport strategy entirely for @Public() routes, so
 * req.user is never populated there even if the caller happens to be logged
 * in — there's no "optional auth" middle ground in this app yet. Personalized
 * sections (which need to know who's asking) live behind real auth instead,
 * and the frontend fetches this only when a customer session exists —
 * matching the "each section refreshes independently" resilience the rest
 * of the homepage already follows.
 */
@ApiTags("Customer Self-Service - Home Personalization")
@UseGuards(CustomerGuard)
@Controller("customer/me/home-personalization")
export class CustomerHomePersonalizationController {
  constructor(private readonly storeService: StoreService) {}

  @Get()
  async get(@CurrentUser() user: AuthenticatedUser) {
    const [recommendedRestaurants, recentlyOrdered] = await Promise.all([
      this.storeService.getRecommendedRestaurants(user.userId),
      this.storeService.getRecentlyOrdered(user.userId),
    ]);
    return { message: "Personalization fetched", data: { recommendedRestaurants, recentlyOrdered } };
  }
}
