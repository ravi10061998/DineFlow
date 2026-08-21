/** DI token — interfaces don't exist at runtime, so the gateway is injected by this token. */
export const PAYMENT_GATEWAY = "PAYMENT_GATEWAY";

export interface GatewayOrder {
  gatewayOrderId: string;
  amount: number;
  currency: string;
}

export interface GatewayRefund {
  gatewayRefundId: string;
}

/**
 * Swappable payment gateway. `MockPaymentGateway` is the only implementation
 * today (no real gateway credentials exist in this dev environment) — it's
 * shaped exactly like a real Razorpay/Stripe adapter would be, so replacing
 * it later means writing one new class, not touching PaymentsService.
 */
export interface PaymentGateway {
  readonly name: string;
  createOrder(amount: number, currency: string, receipt: string): Promise<GatewayOrder>;
  verifySignature(gatewayOrderId: string, gatewayPaymentId: string, signature: string): boolean;
  refund(gatewayPaymentId: string, amount: number): Promise<GatewayRefund>;
}
