export type DeliveryPartnerStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED" | "BLOCKED";
export type VehicleType = "BICYCLE" | "BIKE" | "SCOOTER" | "CAR";

export interface DeliveryPartner {
  id: string;
  userId: string;
  user?: { fullName: string; email: string; phone: string | null };
  vehicleType: VehicleType;
  vehicleNumber: string;
  licenseNumber: string;
  status: DeliveryPartnerStatus;
  rejectionReason: string | null;
  isOnline: boolean;
  currentLatitude: string | null;
  currentLongitude: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryPartnerStatusHistoryEntry {
  id: string;
  fromStatus: DeliveryPartnerStatus;
  toStatus: DeliveryPartnerStatus;
  reason: string | null;
  createdAt: string;
}
