export interface Category {
  id: string;
  restaurantId: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}
