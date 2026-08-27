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
 * Swappable payment gateway — `MockPaymentGateway` and `RazorpayPaymentGateway` both implement
 * this; `payments.module.ts`'s factory decides which one is actually active.
 */
export interface PaymentGateway {
  readonly name: string;
  /**
   * The public-safe key id the frontend's checkout widget needs (Razorpay's `key_id` is
   * deliberately safe to expose client-side — the split from `key_secret` exists exactly for
   * this). Lives on the gateway itself, not a separate PaymentsService config lookup — whichever
   * gateway `payments.module.ts`'s factory actually wired up is the only thing that should decide
   * this, so the two can never disagree about which gateway is "active."
   */
  readonly clientKey: string;
  createOrder(amount: number, currency: string, receipt: string): Promise<GatewayOrder>;
  verifySignature(gatewayOrderId: string, gatewayPaymentId: string, signature: string): boolean;
  refund(gatewayPaymentId: string, amount: number): Promise<GatewayRefund>;
}
