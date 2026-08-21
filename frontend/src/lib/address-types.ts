export type AddressLabel = "HOME" | "WORK" | "OTHER";

export interface CustomerAddress {
  id: string;
  userId: string;
  label: AddressLabel;
  receiverName: string;
  receiverPhone: string;
  addressLine1: string;
  addressLine2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude: string | null;
  longitude: string | null;
  deliveryInstructions: string | null;
  isDefault: boolean;
}
