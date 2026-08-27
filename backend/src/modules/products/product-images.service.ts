import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as crypto from "crypto";
import * as path from "path";
import type { Readable } from "stream";
import { FILE_STORAGE_GATEWAY, FileStorageGateway } from "../../common/storage/file-storage.interface";
import { Product } from "./entities/product.entity";
import { ProductImage } from "./entities/product-image.type";

export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

@Injectable()
export class ProductImagesService {
  constructor(
    @InjectRepository(Product) private readonly productsRepository: Repository<Product>,
    @Inject(FILE_STORAGE_GATEWAY) private readonly storage: FileStorageGateway,
  ) {}

  async addImage(product: Product, file: { buffer: Buffer; originalname: string; mimetype: string }): Promise<ProductImage> {
    const key = `products/${product.id}/${crypto.randomUUID()}${path.extname(file.originalname)}`;
    await this.storage.save(key, file.buffer, file.mimetype);

    const image: ProductImage = {
      id: crypto.randomUUID(),
      path: key,
      originalFileName: file.originalname,
      mimeType: file.mimetype,
    };
    product.images = [...product.images, image];
    await this.productsRepository.save(product);
    return image;
  }

  async removeImage(product: Product, imageId: string): Promise<void> {
    const image = product.images.find((img) => img.id === imageId);
    if (!image) {
      throw new NotFoundException("Image not found");
    }
    product.images = product.images.filter((img) => img.id !== imageId);
    await this.productsRepository.save(product);
    await this.storage.delete(image.path);
  }

  findImageOrThrow(product: Product, imageId: string): ProductImage {
    const image = product.images.find((img) => img.id === imageId);
    if (!image) {
      throw new NotFoundException("Image not found");
    }
    return image;
  }

  async read(image: ProductImage): Promise<{ stream: Readable; sizeBytes?: number }> {
    return this.storage.read(image.path);
  }
}
