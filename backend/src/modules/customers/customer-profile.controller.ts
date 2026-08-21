import { BadRequestException, Body, Controller, Delete, Get, Patch, Post, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags } from "@nestjs/swagger";
import { diskStorage } from "multer";
import type { Response } from "express";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { CurrentUser, AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { CustomerGuard } from "./guards/customer.guard";
import { CustomerProfileService } from "./customer-profile.service";
import {
  CustomerProfileImagesService,
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  CUSTOMER_PHOTO_UPLOAD_ROOT,
} from "./customer-profile-images.service";
import { UpdateCustomerProfileDto } from "./dto/update-customer-profile.dto";

@ApiTags("Customer Self-Service - Profile")
@UseGuards(CustomerGuard)
@Controller("customer/me")
export class CustomerProfileController {
  constructor(
    private readonly profileService: CustomerProfileService,
    private readonly imagesService: CustomerProfileImagesService,
  ) {}

  @Get("profile")
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Profile fetched", data: await this.profileService.getProfile(user.userId) };
  }

  @Patch("profile")
  async updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateCustomerProfileDto) {
    return { message: "Profile updated", data: await this.profileService.updateProfile(user.userId, dto) };
  }

  @Post("profile-photo")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (req, _file, cb) => {
          const userId = (req.user as AuthenticatedUser).userId;
          const dir = path.join(CUSTOMER_PHOTO_UPLOAD_ROOT, userId);
          fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`),
      }),
      limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
          cb(new BadRequestException("Unsupported file type. Allowed: JPEG, PNG, WebP."), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async uploadPhoto(@CurrentUser() user: AuthenticatedUser, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("A file is required.");
    }
    const profile = await this.profileService.findOrCreateProfile(user.userId);
    await this.imagesService.setPhoto(profile, file);
    return { message: "Profile photo uploaded", data: await this.profileService.getProfile(user.userId) };
  }

  @Delete("profile-photo")
  async removePhoto(@CurrentUser() user: AuthenticatedUser) {
    const profile = await this.profileService.findOrCreateProfile(user.userId);
    await this.imagesService.removePhoto(profile);
    return { message: "Profile photo deleted", data: null };
  }

  @Get("profile-photo/file")
  async downloadPhoto(@CurrentUser() user: AuthenticatedUser, @Res() res: Response) {
    const profile = await this.profileService.findOrCreateProfile(user.userId);
    const absolutePath = await this.imagesService.absolutePath(profile);
    res.setHeader("Content-Type", profile.profilePhotoMimeType!);
    res.sendFile(absolutePath);
  }
}
