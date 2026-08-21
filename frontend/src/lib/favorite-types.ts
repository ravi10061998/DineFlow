export type FavoriteTargetType = "RESTAURANT" | "PRODUCT";

export interface Favorite {
  id: string;
  targetType: FavoriteTargetType;
  targetId: string;
  restaurant: { id: string; name: string; slug: string; city: string } | null;
  product: { id: string; name: string; basePrice: string; images: unknown[] } | null;
}
