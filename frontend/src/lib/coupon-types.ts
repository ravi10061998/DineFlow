export type CouponDiscountType = "PERCENTAGE" | "FIXED";

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discountType: CouponDiscountType;
  discountValue: string;
  minOrderAmount: string | null;
  maxDiscountAmount: string | null;
  restaurantId: string | null;
  perCustomerLimit: number;
  totalRedemptionLimit: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CouponRedemption {
  id: string;
  couponId: string;
  customerId: string;
  orderId: string;
  discountAmount: string;
  createdAt: string;
  customer?: { id: string; fullName: string; email: string };
  order?: { id: string; orderNumber: string };
}

export interface CouponPreview {
  coupon: { id: string; code: string; discountType: CouponDiscountType; discountValue: string };
  discountAmount: string;
}
