import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as fs from "fs/promises";
import * as path from "path";
import { Restaurant } from "./entities/restaurant.entity";

export const LOGO_UPLOAD_ROOT = path.resolve(process.cwd(), "uploads", "restaurant-logos");
export const ALLOWED_LOGO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Same shape as CustomerProfileImagesService — a restaurant has at most one
 * logo, served publicly (customers need to see it without a session), unlike
 * a customer's own profile photo which stays behind an authenticated route.
 */
@Injectable()
export class RestaurantLogoService {
  constructor(@InjectRepository(Restaurant) private readonly restaurantsRepository: Repository<Restaurant>) {}

  async setLogo(restaurant: Restaurant, file: { filename: string; originalname: string; mimetype: string }): Promise<Restaurant> {
    const previousPath = restaurant.logoPath;

    restaurant.logoPath = `${restaurant.id}/${file.filename}`; // forward-slash only — persisted, must resolve the same on Linux
    restaurant.logoOriginalName = file.originalname;
    restaurant.logoMimeType = file.mimetype;
    const saved = await this.restaurantsRepository.save(restaurant);

    if (previousPath) {
      await fs.unlink(path.join(LOGO_UPLOAD_ROOT, previousPath)).catch(() => {
        // Old file already missing — the DB row is the source of truth, not worth failing the request over.
      });
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
    await fs.unlink(path.join(LOGO_UPLOAD_ROOT, previousPath)).catch(() => {});
    return saved;
  }

  async absolutePath(restaurant: Restaurant): Promise<string> {
    if (!restaurant.logoPath) {
      throw new NotFoundException("This restaurant has no logo");
    }
    const full = path.join(LOGO_UPLOAD_ROOT, restaurant.logoPath);
    await fs.access(full); // throws ENOENT if missing on disk
    return full;
  }
}
