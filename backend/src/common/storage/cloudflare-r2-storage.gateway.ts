import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DeleteObjectCommand, GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { Readable } from "stream";
import type { FileStorageGateway } from "./file-storage.interface";

/**
 * Cloudflare R2 is S3-API-compatible (same request shapes as AWS S3, different endpoint), so the
 * regular `@aws-sdk/client-s3` client works against it unmodified -- no R2-specific SDK needed.
 * Chosen over AWS S3 itself for its genuinely free tier (10GB storage, zero egress fees) that fits
 * this app's own free/dev deployment story, not because of any code-level dependency on R2.
 *
 * `region: "auto"` and the account-scoped endpoint below are R2's own documented S3-compatibility
 * requirements -- AWS S3 itself would need a real region instead.
 */
@Injectable()
export class CloudflareR2StorageGateway implements FileStorageGateway {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(configService: ConfigService) {
    const accountId = configService.getOrThrow<string>("R2_ACCOUNT_ID");
    this.bucket = configService.getOrThrow<string>("R2_BUCKET_NAME");
    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: configService.getOrThrow<string>("R2_ACCESS_KEY_ID"),
        secretAccessKey: configService.getOrThrow<string>("R2_SECRET_ACCESS_KEY"),
      },
    });
  }

  async save(key: string, buffer: Buffer, mimeType: string): Promise<void> {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: buffer, ContentType: mimeType }));
  }

  async read(key: string): Promise<{ stream: Readable; sizeBytes?: number }> {
    try {
      const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      // In the Node.js runtime (never the browser), S3Client's Body is a real Readable -- the SDK's
      // own type is a wider union to also cover browser/React Native runtimes this app never uses.
      return { stream: result.Body as Readable, sizeBytes: result.ContentLength };
    } catch (err) {
      if (err instanceof NoSuchKey) {
        throw new NotFoundException("File not found");
      }
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key })).catch(() => {
      // Already missing -- the DB row is the source of truth, not worth failing the request over.
    });
  }
}
