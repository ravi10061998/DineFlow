/** One entry in Product.images (jsonb array) — no separate table, images have no independent lifecycle. */
export interface ProductImage {
  id: string;
  /** Relative to PRODUCT_IMAGE_UPLOAD_ROOT — never served via static hosting, only the authenticated file route. */
  path: string;
  originalFileName: string;
  mimeType: string;
}
