import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DeleteObjectCommand, GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { Readable } from "stream";
import type { FileStorageGateway } from "./file-storage.interface";

/**
 * Works against ANY S3-API-compatible object store -- Cloudflare R2, Backblaze B2, MinIO, or AWS
 * S3 itself -- since they all speak the same request shapes, just at different endpoints/regions.
 * `S3_ENDPOINT` is the one thing that actually varies per provider, so it's the one thing this
 * class asks for explicitly rather than deriving a provider-specific URL from something like an
 * account id (an earlier version of this file was Cloudflare-R2-only for exactly that reason, and
 * had to be generalized the first time a genuinely no-card-required alternative -- Backblaze B2 --
 * came up as the actual choice for this app's free/dev deployment).
 *
 * `forcePathStyle: true` is set unconditionally: path-style addressing
 * (`endpoint/bucket/key`) works reliably across every provider this class targets, unlike
 * virtual-hosted-style (`bucket.endpoint/key`), which not every S3-compatible provider supports
 * the same way AWS S3 itself does.
 */
@Injectable()
export class S3CompatibleStorageGateway implements FileStorageGateway {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(configService: ConfigService) {
    this.bucket = configService.getOrThrow<string>("S3_BUCKET_NAME");
    this.client = new S3Client({
      region: configService.get<string>("S3_REGION", "auto"),
      endpoint: configService.getOrThrow<string>("S3_ENDPOINT"),
      forcePathStyle: true,
      credentials: {
        accessKeyId: configService.getOrThrow<string>("S3_ACCESS_KEY_ID"),
        secretAccessKey: configService.getOrThrow<string>("S3_SECRET_ACCESS_KEY"),
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
