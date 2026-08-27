import { Injectable, NotFoundException } from "@nestjs/common";
import * as fs from "fs";
import * as fsPromises from "fs/promises";
import * as path from "path";
import type { FileStorageGateway } from "./file-storage.interface";

/**
 * One shared root for every upload type -- callers namespace their own keys
 * (e.g. `restaurant-logos/<id>/<uuid>.jpg`), matching each service's previous
 * per-type folder exactly, just moved from a baked-in root into the key itself.
 */
export const LOCAL_UPLOAD_ROOT = path.resolve(process.cwd(), "uploads");

/**
 * The zero-setup default: works with no external account, same behavior this app has always had.
 * The real problem it doesn't solve -- files live on whatever container happens to be running,
 * and a platform with ephemeral disk (ours included, on Render's free tier) wipes them on every
 * restart -- is exactly why `S3CompatibleStorageGateway` exists as the other implementation of
 * this same interface. `StorageModule` decides which one a given deployment actually gets.
 */
@Injectable()
export class LocalDiskStorageGateway implements FileStorageGateway {
  // mimeType is part of FileStorageGateway's shared contract (the S3 gateway needs it for
  // ContentType) but
  // unused here -- local disk has no concept of stored content-type, only the DB row does.
  async save(key: string, buffer: Buffer, _mimeType: string): Promise<void> {
    const full = path.join(LOCAL_UPLOAD_ROOT, key);
    await fsPromises.mkdir(path.dirname(full), { recursive: true });
    await fsPromises.writeFile(full, buffer);
  }

  async read(key: string): Promise<{ stream: fs.ReadStream; sizeBytes: number }> {
    const full = path.join(LOCAL_UPLOAD_ROOT, key);
    let stat;
    try {
      stat = await fsPromises.stat(full);
    } catch {
      throw new NotFoundException("File not found");
    }
    return { stream: fs.createReadStream(full), sizeBytes: stat.size };
  }

  async delete(key: string): Promise<void> {
    await fsPromises.unlink(path.join(LOCAL_UPLOAD_ROOT, key)).catch(() => {
      // Already missing -- the DB row is the source of truth, not worth failing the request over.
    });
  }
}
