import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Restaurant } from "../../restaurants/entities/restaurant.entity";
import { Order } from "../../orders/entities/order.entity";

export enum LedgerEntryType {
  ORDER_CREDIT = "ORDER_CREDIT",
  REFUND_DEBIT = "REFUND_DEBIT",
}

/**
 * The running account balance record: what the platform currently owes a
 * restaurant. Single-entry, not double-entry bookkeeping — `amount` is
 * signed (credits positive, debits negative), so a balance is always just
 * `SUM(amount)`, never a separately stored/cached number that could drift
 * out of sync with its own entries. `orderId` is nullable since future entry
 * types (e.g. a payout debit) won't necessarily tie back to one order.
 */
@Entity({ name: "ledger_entries" })
export class LedgerEntry extends BaseEntity {
  @Column({ name: "restaurant_id", type: "uuid" })
  @Index()
  restaurantId!: string;

  @ManyToOne(() => Restaurant, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "restaurant_id" })
  restaurant!: Restaurant;

  @Column({ name: "order_id", type: "uuid", nullable: true })
  orderId!: string | null;

  @ManyToOne(() => Order, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "order_id" })
  order!: Order | null;

  @Column({ type: "enum", enum: LedgerEntryType })
  type!: LedgerEntryType;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  amount!: string;

  @Column({ type: "varchar", length: 500 })
  description!: string;

  /** Null until a settlement run locks this entry into a period — see Module 17. */
  @Column({ name: "settlement_id", type: "uuid", nullable: true })
  @Index()
  settlementId!: string | null;
}
