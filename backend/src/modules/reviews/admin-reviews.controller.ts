import { Controller, Delete, Get, Param, ParseUUIDPipe } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { ReviewsService } from "./reviews.service";

@ApiTags("Admin - Reviews")
@Controller("admin/reviews")
export class AdminReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @RequirePermissions("reviews:read")
  async list() {
    return { message: "Reviews fetched", data: await this.reviewsService.findAllForAdmin() };
  }

  @Delete(":id")
  @RequirePermissions("reviews:manage")
  async remove(@Param("id", ParseUUIDPipe) id: string) {
    await this.reviewsService.removeAsAdmin(id);
    return { message: "Review deleted", data: null };
  }
}
