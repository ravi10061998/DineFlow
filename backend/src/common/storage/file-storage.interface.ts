import type { Readable } from "stream";

/**
 * One abstraction over "where an uploaded file's bytes actually live," used by every module that
 * accepts a file (restaurant logos, restaurant documents, product images, customer profile
 * photos). Same DI-token-plus-interface shape as `PaymentGateway`/`NotificationGateway` — one
 * place decides which concrete implementation is wired up, everything else depends on the
 * interface only.
 *
 * `key` is always a forward-slash relative path the CALLER constructs (e.g.
 * `restaurant-logos/<restaurantId>/<uuid>.jpg`) — never backslash-joined, since this value is
 * persisted and a Windows-built path would silently fail to resolve against a Linux deployment
 * (the same lesson every pre-existing upload service already encoded in its own comments).
 */
export interface FileStorageGateway {
  save(key: string, buffer: Buffer, mimeType: string): Promise<void>;

  /** Throws NotFoundException if the key doesn't exist -- callers don't need their own existence check first. */
  read(key: string): Promise<{ stream: Readable; sizeBytes?: number }>;

  /** Never throws for a missing key -- every existing call site already treats "old file already
   * gone" as fine, since the DB row is the source of truth, not the object store. */
  delete(key: string): Promise<void>;
}

export const FILE_STORAGE_GATEWAY = Symbol("FILE_STORAGE_GATEWAY");
