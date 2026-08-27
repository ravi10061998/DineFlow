import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags } from "@nestjs/swagger";
import { memoryStorage } from "multer";
import type { Response } from "express";
import { CurrentUser, AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { RestaurantMemberGuard } from "./guards/restaurant-member.guard";
import { RestaurantsService } from "./restaurants.service";
import { ALLOWED_DOCUMENT_MIME_TYPES, MAX_DOCUMENT_SIZE_BYTES, RestaurantDocumentsService } from "./restaurant-documents.service";
import { ALLOWED_LOGO_MIME_TYPES, MAX_LOGO_SIZE_BYTES, RestaurantLogoService } from "./restaurant-logo.service";
import { UpdateRestaurantDto } from "./dto/update-restaurant.dto";
import { SetBusinessHoursDto } from "./dto/set-business-hours.dto";
import { CreateHolidayDto } from "./dto/create-holiday.dto";
import { UploadDocumentDto } from "./dto/upload-document.dto";

@ApiTags("Restaurant Self-Service")
@UseGuards(RestaurantMemberGuard)
@Controller("restaurant/me")
export class RestaurantSelfServiceController {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly documentsService: RestaurantDocumentsService,
    private readonly logoService: RestaurantLogoService,
  ) {}

  @Get()
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    const restaurant = await this.restaurantsService.findByIdOrThrow(user.restaurantId!);
    return { message: "Restaurant profile", data: restaurant };
  }

  @Patch()
  async updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateRestaurantDto) {
    const restaurant = await this.restaurantsService.updateOwnProfile(user.restaurantId!, dto);
    return { message: "Restaurant profile updated", data: restaurant };
  }

  @Put("business-hours")
  async setBusinessHours(@CurrentUser() user: AuthenticatedUser, @Body() dto: SetBusinessHoursDto) {
    const hours = await this.restaurantsService.replaceBusinessHours(user.restaurantId!, dto);
    return { message: "Business hours updated", data: hours };
  }

  @Get("business-hours")
  async getBusinessHours(@CurrentUser() user: AuthenticatedUser) {
    const hours = await this.restaurantsService.getBusinessHours(user.restaurantId!);
    return { message: "Business hours fetched", data: hours };
  }

  @Post("holidays")
  async addHoliday(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateHolidayDto) {
    const holiday = await this.restaurantsService.addHoliday(user.restaurantId!, dto);
    return { message: "Holiday added", data: holiday };
  }

  @Get("holidays")
  async getHolidays(@CurrentUser() user: AuthenticatedUser) {
    const holidays = await this.restaurantsService.getHolidays(user.restaurantId!);
    return { message: "Holidays fetched", data: holidays };
  }

  @Delete("holidays/:id")
  async removeHoliday(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    await this.restaurantsService.removeHoliday(user.restaurantId!, id);
    return { message: "Holiday removed", data: null };
  }

  @Post("logo")
  @UseInterceptors(
    FileInterceptor("file", {
      // Buffered in memory, not written to local disk -- the actual destination (local disk in
      // dev, Cloudflare R2 wherever it's configured) is FileStorageGateway's decision, made after
      // Multer finishes parsing, not Multer's own. 5MB max makes this a non-issue for memory use.
      storage: memoryStorage(),
      limits: { fileSize: MAX_LOGO_SIZE_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_LOGO_MIME_TYPES.includes(file.mimetype)) {
          cb(new BadRequestException("Unsupported file type. Allowed: JPEG, PNG, WebP."), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async uploadLogo(@CurrentUser() user: AuthenticatedUser, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("A file is required.");
    }
    const restaurant = await this.restaurantsService.findByIdOrThrow(user.restaurantId!);
    const updated = await this.logoService.setLogo(restaurant, file);
    return { message: "Logo uploaded", data: updated };
  }

  @Delete("logo")
  async removeLogo(@CurrentUser() user: AuthenticatedUser) {
    const restaurant = await this.restaurantsService.findByIdOrThrow(user.restaurantId!);
    const updated = await this.logoService.removeLogo(restaurant);
    return { message: "Logo deleted", data: updated };
  }

  @Post("documents")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: MAX_DOCUMENT_SIZE_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(file.mimetype)) {
          cb(new BadRequestException("Unsupported file type. Allowed: PDF, JPEG, PNG."), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async uploadDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException("A file is required.");
    }
    const document = await this.documentsService.upload({
      restaurantId: user.restaurantId!,
      type: dto.type,
      file,
      uploadedByUserId: user.userId,
    });
    return { message: "Document uploaded", data: document };
  }

  @Get("documents")
  async listDocuments(@CurrentUser() user: AuthenticatedUser) {
    const documents = await this.documentsService.findAllForRestaurant(user.restaurantId!);
    return { message: "Documents fetched", data: documents };
  }

  @Get("documents/:id/file")
  async downloadDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const document = await this.documentsService.findOneOrThrow(id, user.restaurantId!);
    const { stream, sizeBytes } = await this.documentsService.read(document);
    res.setHeader("Content-Type", document.mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${document.originalFileName}"`);
    if (sizeBytes !== undefined) res.setHeader("Content-Length", String(sizeBytes));
    stream.pipe(res);
  }
}
