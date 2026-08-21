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
import { diskStorage } from "multer";
import type { Response } from "express";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { CurrentUser, AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { RestaurantMemberGuard } from "../restaurants/guards/restaurant-member.guard";
import { ProductsService } from "./products.service";
import { ProductImagesService, ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_SIZE_BYTES, PRODUCT_IMAGE_UPLOAD_ROOT } from "./product-images.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { ToggleAvailabilityDto } from "./dto/toggle-availability.dto";
import { ReorderProductsDto } from "./dto/reorder-products.dto";
import { CreateVariantDto } from "./dto/create-variant.dto";
import { UpdateVariantDto } from "./dto/update-variant.dto";
import { CreateAddonDto } from "./dto/create-addon.dto";
import { UpdateAddonDto } from "./dto/update-addon.dto";

@ApiTags("Restaurant Self-Service - Products")
@UseGuards(RestaurantMemberGuard)
@Controller("restaurant/me/products")
export class RestaurantProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly imagesService: ProductImagesService,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Products fetched", data: await this.productsService.findAllForRestaurant(user.restaurantId!) };
  }

  @Get(":id")
  async getOne(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    return { message: "Product fetched", data: await this.productsService.findOneOrThrow(id, user.restaurantId!) };
  }

  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateProductDto) {
    return { message: "Product created", data: await this.productsService.create(user.restaurantId!, dto) };
  }

  @Put("reorder")
  async reorder(@CurrentUser() user: AuthenticatedUser, @Body() dto: ReorderProductsDto) {
    const data = await this.productsService.reorder(user.restaurantId!, dto.categoryId, dto.orderedIds);
    return { message: "Products reordered", data };
  }

  @Patch(":id")
  async update(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateProductDto) {
    return { message: "Product updated", data: await this.productsService.update(id, user.restaurantId!, dto) };
  }

  @Patch(":id/availability")
  async setAvailability(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ToggleAvailabilityDto,
  ) {
    const data = await this.productsService.setAvailability(id, user.restaurantId!, dto.isAvailable);
    return { message: "Availability updated", data };
  }

  @Delete(":id")
  async remove(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    await this.productsService.remove(id, user.restaurantId!);
    return { message: "Product deleted", data: null };
  }

  @Post(":id/images")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (req, _file, cb) => {
          const productId = (req.params as { id: string }).id;
          const dir = path.join(PRODUCT_IMAGE_UPLOAD_ROOT, productId);
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
  async uploadImage(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException("A file is required.");
    }
    const product = await this.productsService.findOneOrThrow(id, user.restaurantId!);
    const image = await this.imagesService.addImage(product, file);
    return { message: "Image uploaded", data: image };
  }

  @Delete(":id/images/:imageId")
  async removeImage(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("imageId") imageId: string,
  ) {
    const product = await this.productsService.findOneOrThrow(id, user.restaurantId!);
    await this.imagesService.removeImage(product, imageId);
    return { message: "Image deleted", data: null };
  }

  @Get(":id/images/:imageId/file")
  async downloadImage(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("imageId") imageId: string,
    @Res() res: Response,
  ) {
    const product = await this.productsService.findOneOrThrow(id, user.restaurantId!);
    const image = this.imagesService.findImageOrThrow(product, imageId);
    const absolutePath = await this.imagesService.absolutePath(image);
    res.setHeader("Content-Type", image.mimeType);
    res.sendFile(absolutePath);
  }

  @Post(":id/variants")
  async addVariant(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: CreateVariantDto) {
    return { message: "Variant added", data: await this.productsService.addVariant(id, user.restaurantId!, dto) };
  }

  @Patch(":id/variants/:variantId")
  async updateVariant(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("variantId", ParseUUIDPipe) variantId: string,
    @Body() dto: UpdateVariantDto,
  ) {
    const data = await this.productsService.updateVariant(id, variantId, user.restaurantId!, dto);
    return { message: "Variant updated", data };
  }

  @Delete(":id/variants/:variantId")
  async removeVariant(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("variantId", ParseUUIDPipe) variantId: string,
  ) {
    await this.productsService.removeVariant(id, variantId, user.restaurantId!);
    return { message: "Variant deleted", data: null };
  }

  @Post(":id/addons")
  async addAddon(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: CreateAddonDto) {
    return { message: "Add-on added", data: await this.productsService.addAddon(id, user.restaurantId!, dto) };
  }

  @Patch(":id/addons/:addonId")
  async updateAddon(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("addonId", ParseUUIDPipe) addonId: string,
    @Body() dto: UpdateAddonDto,
  ) {
    const data = await this.productsService.updateAddon(id, addonId, user.restaurantId!, dto);
    return { message: "Add-on updated", data };
  }

  @Delete(":id/addons/:addonId")
  async removeAddon(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("addonId", ParseUUIDPipe) addonId: string,
  ) {
    await this.productsService.removeAddon(id, addonId, user.restaurantId!);
    return { message: "Add-on deleted", data: null };
  }
}
