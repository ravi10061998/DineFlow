// Mirrors backend/src/modules/*/entities — keep in sync by hand for now.
// A generated client (from the Swagger doc at /api/docs) is worth doing once
// the API surface stabilizes; not worth the setup cost this early.

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

export type RestaurantStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED" | "BLOCKED";

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  ownerFullName: string;
  email: string;
  phone: string;
  description: string | null;
  status: RestaurantStatus;
  rejectionReason: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude: string | null;
  longitude: string | null;
  deliveryRadiusKm: string;
  logoPath: string | null;
  logoOriginalName: string | null;
  logoMimeType: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
  error: { code: string; details?: string[] } | null;
}
