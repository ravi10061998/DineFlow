import { Column, Entity } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { CommissionType } from "../../../common/enums/commission-type.enum";

export enum BillingInterval {
  MONTHLY = "MONTHLY",
  YEARLY = "YEARLY",
  CUSTOM = "CUSTOM",
}

// Re-exported for existing call sites — CommissionType's canonical home is now
// common/enums (shared with commission_rules), not owned by this module.
export { CommissionType };

@Entity({ name: "subscription_plans" })
export class SubscriptionPlan extends BaseEntity {
  @Column({ type: "varchar", length: 100 })
  name!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ name: "billing_interval", type: "enum", enum: BillingInterval })
  billingInterval!: BillingInterval;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  price!: string;

  @Column({ name: "commission_type", type: "enum", enum: CommissionType })
  commissionType!: CommissionType;

  /** Interpreted per commissionType: a percentage (0-100) or a fixed currency amount per order. */
  @Column({ name: "commission_value", type: "decimal", precision: 10, scale: 2 })
  commissionValue!: string;

  /** Schemaless on purpose — no future module has pinned down a fixed feature-flag/limit shape yet. */
  @Column({ type: "jsonb", default: () => "'[]'" })
  features!: string[];

  @Column({ type: "jsonb", default: () => "'{}'" })
  limits!: Record<string, number>;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive!: boolean;

  @Column({ name: "sort_order", type: "integer", default: 0 })
  sortOrder!: number;
}
