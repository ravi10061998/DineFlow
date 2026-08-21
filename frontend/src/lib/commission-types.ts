import type { CommissionType } from "./subscription-types";

export type CommissionSource = "RESTAURANT_OVERRIDE" | "PLAN" | "TRIAL";

export interface EffectiveCommission {
  source: CommissionSource;
  commissionType: CommissionType;
  commissionValue: number;
}

export interface CommissionCalculation extends EffectiveCommission {
  amount: number;
  platformAmount: number;
  restaurantAmount: number;
}

export interface CommissionRule {
  id: string;
  restaurantId: string;
  commissionType: CommissionType;
  commissionValue: string;
  reason: string;
  validFrom: string | null;
  validTo: string | null;
  isActive: boolean;
  createdAt: string;
}
