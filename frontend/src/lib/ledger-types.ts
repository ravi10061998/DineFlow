export type LedgerEntryType = "ORDER_CREDIT" | "REFUND_DEBIT";

export interface LedgerEntry {
  id: string;
  restaurantId: string;
  orderId: string | null;
  order: { orderNumber: string } | null;
  type: LedgerEntryType;
  amount: string;
  description: string;
  createdAt: string;
}

export interface Ledger {
  balance: string;
  entries: LedgerEntry[];
}
