import { Controller, Get, Param, ParseUUIDPipe, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { Public } from "../../common/decorators/public.decorator";
import { RestaurantsService } from "./restaurants.service";
import { RestaurantLogoService } from "./restaurant-logo.service";
import { RestaurantStatus } from "./entities/restaurant.entity";
import { ReviewsService } from "../reviews/reviews.service";

/**
 * The minimal public "browse" slice needed to make Cart/Orders reachable
 * from a real UI — not the full storefront (search, filters), which is a
 * later module's scope. Read-only, approved restaurants only.
 */
@ApiTags("Public - Storefront")
@Public()
@Controller("restaurants")
export class PublicRestaurantsController {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly logoService: RestaurantLogoService,
    private readonly reviewsService: ReviewsService,
  ) {}

  @Get()
  async list() {
    const restaurants = await this.restaurantsService.findAll(RestaurantStatus.APPROVED);
    const ratings = await this.reviewsService.getSummaries(restaurants.map((r) => r.id));
    return {
      message: "Restaurants fetched",
      data: restaurants.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        city: r.city,
        state: r.state,
        hasLogo: !!r.logoPath,
        avgRating: ratings.get(r.id)?.avgRating ?? null,
        reviewCount: ratings.get(r.id)?.reviewCount ?? 0,
      })),
    };
  }

  /** Single-restaurant detail for the customer-facing menu page — same shape as the list, plus a description. */
  @Get(":id")
  async getOne(@Param("id", ParseUUIDPipe) id: string) {
    const r = await this.restaurantsService.findByIdOrThrow(id);
    const rating = await this.reviewsService.getSummary(r.id);
    return {
      message: "Restaurant fetched",
      data: {
        id: r.id,
        name: r.name,
        slug: r.slug,
        description: r.description,
        city: r.city,
        state: r.state,
        hasLogo: !!r.logoPath,
        avgRating: rating.avgRating,
        reviewCount: rating.reviewCount,
      },
    };
  }

  /** No auth needed — a restaurant's logo is public-facing, unlike a customer's own profile photo. */
  @Get(":id/logo")
  async downloadLogo(@Param("id", ParseUUIDPipe) id: string, @Res() res: Response) {
    const restaurant = await this.restaurantsService.findByIdOrThrow(id);
    const { stream, sizeBytes } = await this.logoService.read(restaurant);
    res.setHeader("Content-Type", restaurant.logoMimeType!);
    if (sizeBytes !== undefined) res.setHeader("Content-Length", String(sizeBytes));
    stream.pipe(res);
  }
}
