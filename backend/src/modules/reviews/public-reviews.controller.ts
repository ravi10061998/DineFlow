import { Controller, Get, Param, ParseUUIDPipe } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../../common/decorators/public.decorator";
import { ReviewsService } from "./reviews.service";

/** Public — powers the menu page's real reviews list + rating summary. No auth needed to read reviews. */
@ApiTags("Public - Reviews")
@Public()
@Controller("restaurants/:restaurantId/reviews")
export class PublicReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  async list(@Param("restaurantId", ParseUUIDPipe) restaurantId: string) {
    return { message: "Reviews fetched", data: await this.reviewsService.findForRestaurantPublic(restaurantId) };
  }

  @Get("summary")
  async summary(@Param("restaurantId", ParseUUIDPipe) restaurantId: string) {
    return { message: "Rating summary fetched", data: await this.reviewsService.getSummary(restaurantId) };
  }
}
