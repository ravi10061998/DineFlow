export type AnalyticsPeriod = "7d" | "30d" | "90d" | "all";

export interface AdminOverview {
  period: AnalyticsPeriod;
  totalOrders: number;
  gmv: string;
  commissionEarned: string;
  totalDiscountGiven: string;
  avgOrderValue: string;
  activeCustomers: number;
  platformAvgRating: number | null;
  platformReviewCount: number;
}

export interface RestaurantOverview {
  period: AnalyticsPeriod;
  totalOrders: number;
  revenue: string;
  payout: string;
  avgOrderValue: string;
  avgRating: number | null;
  reviewCount: number;
}

export interface RevenuePoint {
  date: string;
  orderCount: number;
  gmv?: string;
  revenue?: string;
  commissionEarned?: string;
  payout?: string;
}

export interface TopRestaurant {
  restaurantId: string;
  restaurantName: string;
  orderCount: number;
  gmv: string;
}

export interface TopProduct {
  productName: string;
  unitsSold: number;
  revenue: string;
}
