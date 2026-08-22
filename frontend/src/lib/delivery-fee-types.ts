export interface DeliveryFeeEstimate {
  fee: string;
  distanceKm: number | null;
}

export interface DeliveryFeeSettings {
  id: string;
  baseFee: string;
  perKmRate: string;
  freeDeliveryAboveAmount: string | null;
}
