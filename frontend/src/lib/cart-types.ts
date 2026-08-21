export interface PublicRestaurant {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
}

export interface MenuVariant {
  id: string;
  name: string;
  price: string;
  isActive: boolean;
}

export interface MenuAddon {
  id: string;
  name: string;
  price: string;
  isActive: boolean;
}

export interface MenuProduct {
  id: string;
  name: string;
  description: string | null;
  basePrice: string;
  images: { id: string; path: string; originalFileName: string; mimeType: string }[];
  isAvailable: boolean;
  variants: MenuVariant[];
  addons: MenuAddon[];
}

export interface MenuCategory {
  id: string;
  name: string;
  description: string | null;
  products: MenuProduct[];
}

export interface CartLine {
  id: string;
  productId: string;
  productName: string;
  variantId: string | null;
  variantName: string | null;
  addonIds: string[];
  addonNames: string[];
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  isAvailable: boolean;
}

export interface Cart {
  restaurantId: string | null;
  restaurantName: string | null;
  items: CartLine[];
  subtotal: string;
}
