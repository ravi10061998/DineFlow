import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as crypto from "crypto";
import * as path from "path";
import type { Readable } from "stream";
import { FILE_STORAGE_GATEWAY, FileStorageGateway } from "../../common/storage/file-storage.interface";
import {
  RestaurantDocument,
  RestaurantDocumentStatus,
  RestaurantDocumentType,
} from "./entities/restaurant-document.entity";

export const ALLOWED_DOCUMENT_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"];
export const MAX_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

@Injectable()
export class RestaurantDocumentsService {
  constructor(
    @InjectRepository(RestaurantDocument) private readonly documentsRepository: Repository<RestaurantDocument>,
    @Inject(FILE_STORAGE_GATEWAY) private readonly storage: FileStorageGateway,
  ) {}

  async upload(params: {
    restaurantId: string;
    type: RestaurantDocumentType;
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number };
    uploadedByUserId: string;
  }): Promise<RestaurantDocument> {
    const key = `restaurant-documents/${params.restaurantId}/${crypto.randomUUID()}${path.extname(params.file.originalname)}`;
    await this.storage.save(key, params.file.buffer, params.file.mimetype);

    const document = this.documentsRepository.create({
      restaurantId: params.restaurantId,
      type: params.type,
      filePath: key,
      originalFileName: params.file.originalname,
      mimeType: params.file.mimetype,
      fileSizeBytes: params.file.size,
      uploadedByUserId: params.uploadedByUserId,
      status: RestaurantDocumentStatus.PENDING,
    });
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

  async read(document: RestaurantDocument): Promise<{ stream: Readable; sizeBytes?: number }> {
    return this.storage.read(document.filePath);
  }
}
