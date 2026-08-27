import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { CurrentUser, AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { RestaurantsService } from "./restaurants.service";
import { RestaurantDocumentsService } from "./restaurant-documents.service";
import { RestaurantStatus } from "./entities/restaurant.entity";
import { StatusChangeReasonDto } from "./dto/status-change-reason.dto";
import { RejectDocumentDto } from "./dto/reject-document.dto";
import { SetFeaturedDto } from "./dto/set-featured.dto";

@ApiTags("Admin - Restaurants")
@Controller("admin/restaurants")
export class AdminRestaurantsController {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly documentsService: RestaurantDocumentsService,
  ) {}

  @Get()
  @RequirePermissions("restaurants:read")
  async list(@Query("status") status?: RestaurantStatus) {
    const restaurants = await this.restaurantsService.findAll(status);
    return { message: "Restaurants fetched", data: restaurants };
  }

  @Get(":id")
  @RequirePermissions("restaurants:read")
  async getOne(@Param("id", ParseUUIDPipe) id: string) {
    const restaurant = await this.restaurantsService.findByIdOrThrow(id);
    return { message: "Restaurant fetched", data: restaurant };
  }

  @Get(":id/status-history")
  @RequirePermissions("restaurants:read")
  async getStatusHistory(@Param("id", ParseUUIDPipe) id: string) {
    const history = await this.restaurantsService.getStatusHistory(id);
    return { message: "Status history fetched", data: history };
  }

  @Patch(":id/approve")
  @RequirePermissions("restaurants:approve")
  async approve(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() admin: AuthenticatedUser) {
    const restaurant = await this.restaurantsService.approve(id, admin.userId);
    return { message: "Restaurant approved", data: restaurant };
  }

  @Patch(":id/reject")
  @RequirePermissions("restaurants:approve")
  async reject(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: StatusChangeReasonDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    const restaurant = await this.restaurantsService.reject(id, admin.userId, dto.reason);
    return { message: "Restaurant rejected", data: restaurant };
  }

  @Patch(":id/suspend")
  @RequirePermissions("restaurants:manage")
  async suspend(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: StatusChangeReasonDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    const restaurant = await this.restaurantsService.suspend(id, admin.userId, dto.reason);
    return { message: "Restaurant suspended", data: restaurant };
  }

  @Patch(":id/block")
  @RequirePermissions("restaurants:manage")
  async block(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: StatusChangeReasonDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    const restaurant = await this.restaurantsService.block(id, admin.userId, dto.reason);
    return { message: "Restaurant blocked", data: restaurant };
  }

  @Patch(":id/reinstate")
  @RequirePermissions("restaurants:manage")
  async reinstate(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() admin: AuthenticatedUser) {
    const restaurant = await this.restaurantsService.reinstate(id, admin.userId);
    return { message: "Restaurant reinstated", data: restaurant };
  }

  @Patch(":id/resubmit")
  @RequirePermissions("restaurants:approve")
  async resubmit(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() admin: AuthenticatedUser) {
    const restaurant = await this.restaurantsService.resubmit(id, admin.userId);
    return { message: "Restaurant moved back to pending review", data: restaurant };
  }

  @Patch(":id/featured")
  @RequirePermissions("content:manage")
  async setFeatured(@Param("id", ParseUUIDPipe) id: string, @Body() dto: SetFeaturedDto) {
    const restaurant = await this.restaurantsService.setFeatured(id, dto.isFeatured);
    return { message: "Featured status updated", data: restaurant };
  }

  @Get(":id/documents")
  @RequirePermissions("restaurants:read")
  async listDocuments(@Param("id", ParseUUIDPipe) id: string) {
    const documents = await this.documentsService.findAllForRestaurant(id);
    return { message: "Documents fetched", data: documents };
  }

  @Patch(":id/documents/:docId/verify")
  @RequirePermissions("restaurants:approve")
  async verifyDocument(@Param("docId", ParseUUIDPipe) docId: string) {
    const document = await this.documentsService.verify(docId);
    return { message: "Document verified", data: document };
  }

  @Patch(":id/documents/:docId/reject")
  @RequirePermissions("restaurants:approve")
  async rejectDocument(@Param("docId", ParseUUIDPipe) docId: string, @Body() dto: RejectDocumentDto) {
    const document = await this.documentsService.reject(docId, dto.reason);
    return { message: "Document rejected", data: document };
  }

  @Get(":id/documents/:docId/file")
  @RequirePermissions("restaurants:read")
  async downloadDocument(@Param("docId", ParseUUIDPipe) docId: string, @Res() res: Response) {
    const document = await this.documentsService.findOneOrThrow(docId);
    const { stream, sizeBytes } = await this.documentsService.read(document);
    res.setHeader("Content-Type", document.mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${document.originalFileName}"`);
    if (sizeBytes !== undefined) res.setHeader("Content-Length", String(sizeBytes));
    stream.pipe(res);
  }
}
