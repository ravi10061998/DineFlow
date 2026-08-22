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
  totalAmount: string;
  status: OrderStatus;
  paymentStatus: string;
  cancellationReason: string | null;
  items: OrderItem[];
  createdAt: string;
}

export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PLACED: "CONFIRMED",
  CONFIRMED: "PREPARING",
  PREPARING: "READY",
  READY: "OUT_FOR_DELIVERY",
  OUT_FOR_DELIVERY: "DELIVERED",
};

export const CANCELLABLE_BY_RESTAURANT: OrderStatus[] = ["PLACED", "CONFIRMED", "PREPARING"];
