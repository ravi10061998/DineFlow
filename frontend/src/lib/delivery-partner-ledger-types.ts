export interface DeliveryPartnerLedgerEntry {
  id: string;
  deliveryPartnerId: string;
  deliveryAssignmentId: string | null;
  type: "DELIVERY_CREDIT";
  amount: string;
  description: string;
  payoutId: string | null;
  createdAt: string;
}

export interface DeliveryPartnerLedgerView {
  balance: string;
  entries: DeliveryPartnerLedgerEntry[];
}

export interface DeliveryPartnerPayout {
  id: string;
  deliveryPartnerId: string;
  deliveryPartner?: { user: { fullName: string } } | null;
  periodStart: string;
  periodEnd: string;
  gateway: string;
  gatewayPayoutId: string | null;
  amount: string;
  status: "SUCCEEDED" | "FAILED";
  failureReason: string | null;
  createdAt: string;
}

export interface DeliveryPartnerFeeSettings {
  id: string;
  perDeliveryRate: string;
}
