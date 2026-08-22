export interface Review {
  id: string;
  orderId: string;
  customerId: string;
  restaurantId: string;
  rating: number;
  comment: string | null;
  restaurantResponse: string | null;
  restaurantRespondedAt: string | null;
  createdAt: string;
  customer?: { id: string; fullName: string };
  restaurant?: { id: string; name: string };
}

export interface RatingSummary {
  avgRating: number | null;
  reviewCount: number;
}
