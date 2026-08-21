export interface Refund {
  id: string;
  orderId: string;
  order: { orderNumber: string } | null;
  paymentId: string;
  gateway: string;
  gatewayRefundId: string | null;
  amount: string;
  reason: string | null;
  status: "SUCCEEDED" | "FAILED";
  failureReason: string | null;
  createdAt: string;
}
