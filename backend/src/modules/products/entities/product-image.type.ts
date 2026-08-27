/** One entry in Product.images (jsonb array) — no separate table, images have no independent lifecycle. */
export interface ProductImage {
  id: string;
  /** A FileStorageGateway key (e.g. "products/<id>/<uuid>.jpg") — never served via static hosting, only the file route below. */
  path: string;
  originalFileName: string;
  mimeType: string;
}
