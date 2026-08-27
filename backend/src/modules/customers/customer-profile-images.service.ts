import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as crypto from "crypto";
import * as path from "path";
import type { Readable } from "stream";
import { FILE_STORAGE_GATEWAY, FileStorageGateway } from "../../common/storage/file-storage.interface";
import { CustomerProfile } from "./entities/customer-profile.entity";

export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

@Injectable()
export class CustomerProfileImagesService {
  constructor(
    @InjectRepository(CustomerProfile) private readonly profilesRepository: Repository<CustomerProfile>,
    @Inject(FILE_STORAGE_GATEWAY) private readonly storage: FileStorageGateway,
  ) {}

  /** A customer has at most one profile photo — uploading a new one replaces (and deletes) the old one. */
  async setPhoto(profile: CustomerProfile, file: { buffer: Buffer; originalname: string; mimetype: string }): Promise<void> {
    const previousPath = profile.profilePhotoPath;
    const key = `customers/${profile.userId}/${crypto.randomUUID()}${path.extname(file.originalname)}`;
    await this.storage.save(key, file.buffer, file.mimetype);

    profile.profilePhotoPath = key;
    profile.profilePhotoOriginalName = file.originalname;
    profile.profilePhotoMimeType = file.mimetype;
    await this.profilesRepository.save(profile);

    if (previousPath) {
      await this.storage.delete(previousPath);
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
    await this.storage.delete(previousPath);
  }

  async read(profile: CustomerProfile): Promise<{ stream: Readable; sizeBytes?: number }> {
    if (!profile.profilePhotoPath) {
      throw new NotFoundException("No profile photo set");
    }
    return this.storage.read(profile.profilePhotoPath);
  }
}
