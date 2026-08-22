import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Restaurant } from "../../restaurants/entities/restaurant.entity";

/**
 * An immutable record of "this much was owed to this restaurant for this
 * period" — created by locking in every currently-unsettled `ledger_entries`
 * row at run time. Deliberately has no status/workflow field: a settlement
 * is a calculated fact, not a task. Whether the money has actually been
 * transferred is Payout's (the next module's) job to track, against its own
 * `payouts` table referencing this settlement.
 */
@Entity({ name: "settlements" })
export class Settlement extends BaseEntity {
  @Column({ name: "restaurant_id", type: "uuid" })
  @Index()
  restaurantId!: string;

  @ManyToOne(() => Restaurant, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "restaurant_id" })
  restaurant!: Restaurant;

  /** The earliest unsettled ledger entry's timestamp at run time — descriptive, not a query filter (settlement_id on ledger_entries is the actual source of truth). */
  @Column({ name: "period_start", type: "timestamptz" })
  periodStart!: Date;

  @Column({ name: "period_end", type: "timestamptz" })
  periodEnd!: Date;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  amount!: string;
}
