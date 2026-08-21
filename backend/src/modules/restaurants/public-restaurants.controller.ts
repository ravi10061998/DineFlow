import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../../common/decorators/public.decorator";
import { RestaurantsService } from "./restaurants.service";
import { RestaurantStatus } from "./entities/restaurant.entity";

/**
 * The minimal public "browse" slice needed to make Cart/Orders reachable
 * from a real UI — not the full storefront (search, filters, ratings),
 * which is a later module's scope. Read-only, approved restaurants only.
 */
@ApiTags("Public - Storefront")
@Public()
@Controller("restaurants")
export class PublicRestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Get()
  async list() {
    const restaurants = await this.restaurantsService.findAll(RestaurantStatus.APPROVED);
    return {
      message: "Restaurants fetched",
      data: restaurants.map((r) => ({ id: r.id, name: r.name, slug: r.slug, city: r.city, state: r.state })),
    };
  }
}
