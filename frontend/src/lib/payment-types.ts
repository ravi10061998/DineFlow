export interface Payment {
  id: string;
  orderId: string;
  order: { orderNumber: string } | null;
  gateway: string;
  gatewayOrderId: string;
  gatewayPaymentId: string | null;
  amount: string;
  currency: string;
  status: "CREATED" | "SUCCEEDED" | "FAILED";
  failureReason: string | null;
  createdAt: string;
}
