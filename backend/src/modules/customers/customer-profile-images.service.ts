import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as fs from "fs/promises";
import * as path from "path";
import { CustomerProfile } from "./entities/customer-profile.entity";

export const CUSTOMER_PHOTO_UPLOAD_ROOT = path.resolve(process.cwd(), "uploads", "customers");
export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

@Injectable()
export class CustomerProfileImagesService {
  constructor(@InjectRepository(CustomerProfile) private readonly profilesRepository: Repository<CustomerProfile>) {}

  /** A customer has at most one profile photo — uploading a new one replaces (and deletes) the old one. */
  async setPhoto(profile: CustomerProfile, file: { filename: string; originalname: string; mimetype: string }): Promise<void> {
    const previousPath = profile.profilePhotoPath;

    profile.profilePhotoPath = `${profile.userId}/${file.filename}`; // forward-slash only — persisted, must resolve the same on Linux
    profile.profilePhotoOriginalName = file.originalname;
    profile.profilePhotoMimeType = file.mimetype;
    await this.profilesRepository.save(profile);

    if (previousPath) {
      await fs.unlink(path.join(CUSTOMER_PHOTO_UPLOAD_ROOT, previousPath)).catch(() => {
        // Old file already missing — the DB row is the source of truth, not worth failing the request over.
      });
    }
  }

  async removePhoto(profile: CustomerProfile): Promise<void> {
    if (!profile.profilePhotoPath) {
      throw new NotFoundException("No profile photo to delete");
    }
    const previousPath = profile.profilePhotoPath;
    profile.profilePhotoPath = null;
    profile.profilePhotoOriginalName = null;
    profile.profilePhotoMimeType = null;
    await this.profilesRepository.save(profile);
    await fs.unlink(path.join(CUSTOMER_PHOTO_UPLOAD_ROOT, previousPath)).catch(() => {});
  }

  async absolutePath(profile: CustomerProfile): Promise<string> {
    if (!profile.profilePhotoPath) {
      throw new NotFoundException("No profile photo set");
    }
    const full = path.join(CUSTOMER_PHOTO_UPLOAD_ROOT, profile.profilePhotoPath);
    await fs.access(full); // throws ENOENT if missing on disk
    return full;
  }
}
