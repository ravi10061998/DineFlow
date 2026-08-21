import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Restaurant } from "../../restaurants/entities/restaurant.entity";
import { SubscriptionPlan, CommissionType } from "./subscription-plan.entity";

export enum SubscriptionStatus {
  TRIAL = "TRIAL",
  ACTIVE = "ACTIVE",
  PAST_DUE = "PAST_DUE",
  CANCELLED = "CANCELLED",
  EXPIRED = "EXPIRED",
  SUSPENDED = "SUSPENDED",
}

/**
 * One row per restaurant (unique on restaurantId) — mutated in place as the
 * restaurant moves through trial/plan states. Full history of *changes* to
 * this row lives in SubscriptionEvent, never in extra rows here.
 */
@Entity({ name: "restaurant_subscriptions" })
export class RestaurantSubscription extends BaseEntity {
  @Column({ name: "restaurant_id", type: "uuid", unique: true })
  @Index()
  restaurantId!: string;

  @ManyToOne(() => Restaurant, { onDelete: "CASCADE" })
  @JoinColumn({ name: "restaurant_id" })
  restaurant!: Restaurant;

  @Column({ type: "enum", enum: SubscriptionStatus })
  status!: SubscriptionStatus;

  @Column({ name: "plan_id", type: "uuid", nullable: true })
  planId!: string | null;

  @ManyToOne(() => SubscriptionPlan, { nullable: true })
  @JoinColumn({ name: "plan_id" })
  plan!: SubscriptionPlan | null;

  @Column({ name: "trial_started_at", type: "timestamptz", nullable: true })
  trialStartedAt!: Date | null;

  @Column({ name: "trial_ends_at", type: "timestamptz", nullable: true })
  trialEndsAt!: Date | null;

  @Column({ name: "current_period_start", type: "timestamptz", nullable: true })
  currentPeriodStart!: Date | null;

  @Column({ name: "current_period_end", type: "timestamptz", nullable: true })
  currentPeriodEnd!: Date | null;

  // Snapshotted at subscribe-time — a later plan price/commission change must
  // never retroactively change what an already-subscribed restaurant pays.
  @Column({ name: "price_snapshot", type: "decimal", precision: 10, scale: 2, nullable: true })
  priceSnapshot!: string | null;

  @Column({ name: "commission_type_snapshot", type: "enum", enum: CommissionType, nullable: true })
  commissionTypeSnapshot!: CommissionType | null;

  @Column({ name: "commission_value_snapshot", type: "decimal", precision: 10, scale: 2, nullable: true })
  commissionValueSnapshot!: string | null;

  @Column({ name: "cancelled_at", type: "timestamptz", nullable: true })
  cancelledAt!: Date | null;
}
