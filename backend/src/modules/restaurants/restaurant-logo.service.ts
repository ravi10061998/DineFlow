import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as crypto from "crypto";
import * as path from "path";
import type { Readable } from "stream";
import { FILE_STORAGE_GATEWAY, FileStorageGateway } from "../../common/storage/file-storage.interface";
import { Restaurant } from "./entities/restaurant.entity";

export const ALLOWED_LOGO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Same shape as CustomerProfileImagesService — a restaurant has at most one
 * logo, served publicly (customers need to see it without a session), unlike
 * a customer's own profile photo which stays behind an authenticated route.
 */
@Injectable()
export class RestaurantLogoService {
  constructor(
    @InjectRepository(Restaurant) private readonly restaurantsRepository: Repository<Restaurant>,
    @Inject(FILE_STORAGE_GATEWAY) private readonly storage: FileStorageGateway,
  ) {}

  async setLogo(restaurant: Restaurant, file: { buffer: Buffer; originalname: string; mimetype: string }): Promise<Restaurant> {
    const previousPath = restaurant.logoPath;
    const key = `restaurant-logos/${restaurant.id}/${crypto.randomUUID()}${path.extname(file.originalname)}`;
    await this.storage.save(key, file.buffer, file.mimetype);

    restaurant.logoPath = key;
    restaurant.logoOriginalName = file.originalname;
    restaurant.logoMimeType = file.mimetype;
    const saved = await this.restaurantsRepository.save(restaurant);

    if (previousPath) {
      await this.storage.delete(previousPath);
    }
    return saved;
  }

  async removeLogo(restaurant: Restaurant): Promise<Restaurant> {
    if (!restaurant.logoPath) {
      throw new NotFoundException("No logo to delete");
    }
    const previousPath = restaurant.logoPath;
    restaurant.logoPath = null;
    restaurant.logoOriginalName = null;
    restaurant.logoMimeType = null;
    const saved = await this.restaurantsRepository.save(restaurant);
    await this.storage.delete(previousPath);
    return saved;
  }

  async read(restaurant: Restaurant): Promise<{ stream: Readable; sizeBytes?: number }> {
    if (!restaurant.logoPath) {
      throw new NotFoundException("This restaurant has no logo");
    }
    return this.storage.read(restaurant.logoPath);
  }
}
