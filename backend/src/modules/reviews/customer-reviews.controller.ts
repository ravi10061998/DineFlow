import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { CustomerGuard } from "../customers/guards/customer.guard";
import { ReviewsService } from "./reviews.service";
import { CreateReviewDto } from "./dto/create-review.dto";
import { UpdateReviewDto } from "./dto/update-review.dto";

@ApiTags("Customer Self-Service - Reviews")
@UseGuards(CustomerGuard)
@Controller("customer/me/reviews")
export class CustomerReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Reviews fetched", data: await this.reviewsService.findOwnForCustomer(user.userId) };
  }

  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateReviewDto) {
    return { message: "Review submitted", data: await this.reviewsService.createForOrder(user.userId, dto) };
  }

  @Patch(":id")
  async update(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateReviewDto) {
    return { message: "Review updated", data: await this.reviewsService.updateOwn(user.userId, id, dto) };
  }
}
