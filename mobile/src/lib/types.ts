// Trimmed mirror of frontend/src/lib/*-types.ts — only the Customer-role slice this app needs.
// Kept as plain duplicated types rather than a shared package: this workspace doesn't share a
// build pipeline with `frontend`, and the API surface is still young enough that hand-syncing
// (the same approach frontend/src/lib/types.ts itself documents) is cheaper than the tooling.

export type RoleName = "ADMIN" | "RESTAURANT_ADMIN" | "RESTAURANT_STAFF" | "CUSTOMER" | "DELIVERY_PARTNER";

export interface AuthUser {
  id: string;
  email: string;
  phone: string | null;
  fullName: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  role: RoleName;
  restaurantId: string | null;
  emailVerified: boolean;
  permissions?: string[];
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
  error: { code: string; details?: string[] } | null;
}

export interface PublicRestaurant {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  hasLogo: boolean;
  avgRating: number | null;
  reviewCount: number;
}

export interface PublicRestaurantDetail extends PublicRestaurant {
  description: string | null;
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

export interface CartLineAddon {
  id: string;
  name: string;
  price: string;
}

export interface CartLine {
  id: string;
  productId: string;
  productName: string;
  variantId: string | null;
  variantName: string | null;
  variantPrice: string | null;
  addons: CartLineAddon[];
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

export type OrderStatus = "PLACED" | "CONFIRMED" | "PREPARING" | "READY" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED";

export interface OrderItemAddon {
  id: string;
  name: string;
  price: string;
}

export interface OrderItem {
  id: string;
  productId: string | null;
  productName: string;
  variantId: string | null;
  variantName: string | null;
  addons: OrderItemAddon[];
  unitPrice: string;
  quantity: number;
  lineTotal: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  restaurantId: string;
  deliveryReceiverName: string;
  deliveryReceiverPhone: string;
  deliveryAddressLine1: string;
  deliveryAddressLine2: string | null;
  deliveryLandmark: string | null;
  deliveryCity: string;
  deliveryState: string;
  deliveryPostalCode: string;
  deliveryCountry: string;
  subtotal: string;
  commissionAmount: string;
  restaurantPayoutAmount: string;
  deliveryFee: string;
  deliveryDistanceKm: string | null;
  discountAmount: string;
  couponCode: string | null;
  totalAmount: string;
  status: OrderStatus;
  paymentStatus: string;
  cancellationReason: string | null;
  items: OrderItem[];
  createdAt: string;
}

export const CANCELLABLE_STATUSES: OrderStatus[] = ["PLACED"];

export type AddressLabel = "HOME" | "WORK" | "OTHER";

export interface CustomerAddress {
  id: string;
  userId: string;
  label: AddressLabel;
  receiverName: string;
  receiverPhone: string;
  addressLine1: string;
  addressLine2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude: string | null;
  longitude: string | null;
  deliveryInstructions: string | null;
  isDefault: boolean;
}

export type CouponDiscountType = "PERCENTAGE" | "FIXED";

export interface CouponPreview {
  coupon: { id: string; code: string; discountType: CouponDiscountType; discountValue: string };
  discountAmount: string;
}

export interface DeliveryFeeEstimate {
  fee: string;
  distanceKm: number | null;
}

export interface Review {
  id: string;
  orderId: string;
  customerId: string;
  restaurantId: string;
  rating: number;
  comment: string | null;
  restaurantResponse: string | null;
  restaurantRespondedAt: string | null;
  createdAt: string;
  customer?: { id: string; fullName: string };
  restaurant?: { id: string; name: string };
}

export type DeliveryAssignmentStatus = "ASSIGNED" | "ACCEPTED" | "REJECTED" | "PICKED_UP" | "DELIVERED";

export interface DeliveryAssignment {
  id: string;
  orderId: string;
  restaurantId: string;
  deliveryPartnerId: string;
  deliveryPartner?: { user: { fullName: string; phone: string | null } } | null;
  status: DeliveryAssignmentStatus;
  deliveryOtp: string;
  acceptedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  distanceRemainingKm?: number | null;
}
