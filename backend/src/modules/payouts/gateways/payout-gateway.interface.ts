/** DI token — interfaces don't exist at runtime, so the gateway is injected by this token. */
export const PAYOUT_GATEWAY = "PAYOUT_GATEWAY";

export interface GatewayPayout {
  gatewayPayoutId: string;
}

/**
 * A restaurant bank payout is a genuinely different integration from customer
 * checkout/refunds (real platforms use a separate product for it — e.g.
 * Stripe Connect Transfers, Razorpay Route) even though the underlying
 * gateway vendor might be the same one — hence its own interface/token
 * rather than bolting a `payout()` method onto `PaymentGateway`.
 */
export interface PayoutGateway {
  readonly name: string;
  payout(restaurantId: string, amount: number): Promise<GatewayPayout>;
}
