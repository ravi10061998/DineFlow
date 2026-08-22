export interface FoodCategory {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  ctaLabel: string | null;
  ctaUrl: string | null;
}

export interface Offer {
  id: string;
  code: string;
  title: string;
  description: string | null;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: string;
  minOrderAmount: string | null;
  maxDiscountAmount: string | null;
  expiresAt: string | null;
  restaurantId: string | null;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
}

export interface Blog {
  id: string;
  title: string;
  slug: string;
  coverImageUrl: string | null;
  category: BlogCategory | null;
  authorName: string;
  excerpt: string;
  content: string;
  readingTimeMinutes: number;
  publishedAt: string | null;
}

export interface PaginatedBlogs {
  items: Blog[];
  total: number;
  page: number;
  pageSize: number;
}

export interface StoreRestaurant {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  status: string;
  isFeatured: boolean;
  hasLogo: boolean;
  avgRating: number | null;
  reviewCount: number;
  distanceKm?: number;
}

export interface StoreProduct {
  id: string;
  name: string;
  basePrice: string;
  images: { id: string; path: string; originalFileName: string; mimeType: string }[];
  restaurantId: string;
  restaurantName: string;
  orderCount: number;
}

export interface HomeFeed {
  banners: Banner[];
  categories: FoodCategory[];
  featuredRestaurants: StoreRestaurant[];
  popularRestaurants: StoreRestaurant[];
  popularProducts: StoreProduct[];
  trendingProducts: StoreProduct[];
  offers: Offer[];
  blogs: Blog[];
}

export interface HomePersonalization {
  recommendedRestaurants: StoreRestaurant[];
  recentlyOrdered: StoreProduct[];
}

export interface SearchResults {
  restaurants: StoreRestaurant[];
  products: StoreProduct[];
  categories: FoodCategory[];
}
