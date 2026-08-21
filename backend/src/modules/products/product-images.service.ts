import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";
import { Product } from "./entities/product.entity";
import { ProductImage } from "./entities/product-image.type";

export const PRODUCT_IMAGE_UPLOAD_ROOT = path.resolve(process.cwd(), "uploads", "products");
export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

@Injectable()
export class ProductImagesService {
  constructor(@InjectRepository(Product) private readonly productsRepository: Repository<Product>) {}

  async addImage(
    product: Product,
    file: { filename: string; originalname: string; mimetype: string },
  ): Promise<ProductImage> {
    const image: ProductImage = {
      id: crypto.randomUUID(),
      // Always forward-slash, not path.join — this is persisted, and a
      // backslash-joined path built on Windows dev would silently fail to
      // resolve on a Linux deployment (same lesson as Module 3's documents).
      path: `${product.id}/${file.filename}`,
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
    await fs.unlink(path.join(PRODUCT_IMAGE_UPLOAD_ROOT, image.path)).catch(() => {
      // File already missing on disk — the DB record is the source of truth, not worth failing the request over.
    });
  }

  findImageOrThrow(product: Product, imageId: string): ProductImage {
    const image = product.images.find((img) => img.id === imageId);
    if (!image) {
      throw new NotFoundException("Image not found");
    }
    return image;
  }

  async absolutePath(image: ProductImage): Promise<string> {
    const full = path.join(PRODUCT_IMAGE_UPLOAD_ROOT, image.path);
    await fs.access(full); // throws ENOENT if the file is missing on disk
    return full;
  }
}
