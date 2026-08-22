import { Column, Entity, Index, JoinColumn, ManyToOne, OneToOne } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Settlement } from "../../settlements/entities/settlement.entity";
import { Restaurant } from "../../restaurants/entities/restaurant.entity";

export enum PayoutStatus {
  SUCCEEDED = "SUCCEEDED",
  FAILED = "FAILED",
}

/**
 * The actual transfer execution for one Settlement — 1:1, unique on
 * `settlementId`. Kept as its own record rather than a field on Settlement,
 * same reasoning as Refund being its own row rather than mutating Payment:
 * "money was calculated as owed" and "money was actually sent" are two
 * separate financial facts, even though they're tightly coupled here.
 */
@Entity({ name: "payouts" })
export class Payout extends BaseEntity {
  @Column({ name: "settlement_id", type: "uuid", unique: true })
  @Index()
  settlementId!: string;

  @OneToOne(() => Settlement, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "settlement_id" })
  settlement!: Settlement;

  @Column({ name: "restaurant_id", type: "uuid" })
  @Index()
  restaurantId!: string;

  @ManyToOne(() => Restaurant, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "restaurant_id" })
  restaurant!: Restaurant;

  @Column({ type: "varchar", length: 20 })
  gateway!: string;

  @Column({ name: "gateway_payout_id", type: "varchar", length: 100, nullable: true })
  gatewayPayoutId!: string | null;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  amount!: string;

  @Column({ type: "enum", enum: PayoutStatus })
  status!: PayoutStatus;

  @Column({ name: "failure_reason", type: "varchar", length: 500, nullable: true })
  failureReason!: string | null;
}
