export interface ProductImage {
  id: string;
  path: string;
  originalFileName: string;
  mimeType: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  price: string;
  isActive: boolean;
}

export interface ProductAddon {
  id: string;
  productId: string;
  name: string;
  price: string;
  isActive: boolean;
}

export interface Product {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description: string | null;
  basePrice: string;
  images: ProductImage[];
  sortOrder: number;
  isActive: boolean;
  isAvailable: boolean;
  variants: ProductVariant[];
  addons: ProductAddon[];
}
