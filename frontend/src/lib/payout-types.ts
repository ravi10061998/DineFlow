export type PayoutStatus = "SUCCEEDED" | "FAILED";

export interface Payout {
  id: string;
  settlementId: string;
  restaurantId: string;
  restaurant?: { name: string } | null;
  gateway: string;
  gatewayPayoutId: string | null;
  amount: string;
  status: PayoutStatus;
  failureReason: string | null;
  createdAt: string;
}
