export interface Settlement {
  id: string;
  restaurantId: string;
  restaurant?: { name: string } | null;
  periodStart: string;
  periodEnd: string;
  amount: string;
  createdAt: string;
}
