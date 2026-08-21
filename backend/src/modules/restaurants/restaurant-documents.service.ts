import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as fs from "fs/promises";
import * as path from "path";
import {
  RestaurantDocument,
  RestaurantDocumentStatus,
  RestaurantDocumentType,
} from "./entities/restaurant-document.entity";

export const DOCUMENT_UPLOAD_ROOT = path.resolve(process.cwd(), "uploads", "restaurant-documents");
export const ALLOWED_DOCUMENT_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"];
export const MAX_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

@Injectable()
export class RestaurantDocumentsService {
  constructor(
    @InjectRepository(RestaurantDocument) private readonly documentsRepository: Repository<RestaurantDocument>,
  ) {}

  async recordUpload(params: {
    restaurantId: string;
    type: RestaurantDocumentType;
    filePath: string;
    originalFileName: string;
    mimeType: string;
    fileSizeBytes: number;
    uploadedByUserId: string;
  }): Promise<RestaurantDocument> {
    const document = this.documentsRepository.create({ ...params, status: RestaurantDocumentStatus.PENDING });
    return this.documentsRepository.save(document);
  }

  findAllForRestaurant(restaurantId: string): Promise<RestaurantDocument[]> {
    return this.documentsRepository.find({ where: { restaurantId }, order: { createdAt: "DESC" } });
  }

  async findOneOrThrow(id: string, restaurantId?: string): Promise<RestaurantDocument> {
    const document = await this.documentsRepository.findOne({
      where: restaurantId ? { id, restaurantId } : { id },
    });
    if (!document) {
      throw new NotFoundException("Document not found");
    }
    return document;
  }

  async verify(id: string): Promise<RestaurantDocument> {
    const document = await this.findOneOrThrow(id);
    document.status = RestaurantDocumentStatus.VERIFIED;
    document.rejectionReason = null;
    return this.documentsRepository.save(document);
  }

  async reject(id: string, reason: string): Promise<RestaurantDocument> {
    const document = await this.findOneOrThrow(id);
    document.status = RestaurantDocumentStatus.REJECTED;
    document.rejectionReason = reason;
    return this.documentsRepository.save(document);
  }

  async absolutePath(document: RestaurantDocument): Promise<string> {
    const full = path.join(DOCUMENT_UPLOAD_ROOT, document.filePath);
    await fs.access(full); // throws ENOENT if the file is missing on disk
    return full;
  }
}
