export type DeliveryAssignmentStatus = "ASSIGNED" | "ACCEPTED" | "REJECTED" | "PICKED_UP" | "DELIVERED";

export interface DeliveryAssignment {
  id: string;
  orderId: string;
  order?: { orderNumber: string } | null;
  restaurantId: string;
  deliveryPartnerId: string;
  deliveryPartner?: { user: { fullName: string; phone: string | null } } | null;
  status: DeliveryAssignmentStatus;
  deliveryOtp: string;
  acceptedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  /** Only present once both the order's delivery point and the partner's last-shared location exist. */
  distanceRemainingKm?: number | null;
}
