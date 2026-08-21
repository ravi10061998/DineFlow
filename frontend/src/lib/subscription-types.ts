export type BillingInterval = "MONTHLY" | "YEARLY" | "CUSTOM";
export type CommissionType = "PERCENTAGE" | "FIXED";
export type SubscriptionStatus = "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELLED" | "EXPIRED" | "SUSPENDED";

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  billingInterval: BillingInterval;
  price: string;
  commissionType: CommissionType;
  commissionValue: string;
  features: string[];
  limits: Record<string, number>;
  isActive: boolean;
  sortOrder: number;
}

export interface TrialSettings {
  id: string;
  isEnabled: boolean;
  trialDurationDays: number;
  reminderScheduleDays: number[];
}

export interface RestaurantSubscription {
  id: string;
  restaurantId: string;
  status: SubscriptionStatus;
  planId: string | null;
  plan: SubscriptionPlan | null;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  priceSnapshot: string | null;
  commissionTypeSnapshot: CommissionType | null;
  commissionValueSnapshot: string | null;
  cancelledAt: string | null;
}

export interface SubscriptionEvent {
  id: string;
  type: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}
