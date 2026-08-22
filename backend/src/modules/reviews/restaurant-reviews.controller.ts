import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { RestaurantMemberGuard } from "../restaurants/guards/restaurant-member.guard";
import { ReviewsService } from "./reviews.service";
import { RespondReviewDto } from "./dto/respond-review.dto";

@ApiTags("Restaurant Self-Service - Reviews")
@UseGuards(RestaurantMemberGuard)
@Controller("restaurant/me/reviews")
export class RestaurantReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Reviews fetched", data: await this.reviewsService.findForRestaurantSelf(user.restaurantId!) };
  }

  @Patch(":id/respond")
  async respond(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: RespondReviewDto) {
    return { message: "Response posted", data: await this.reviewsService.respondAsRestaurant(user.restaurantId!, id, dto) };
  }
}
