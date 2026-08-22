import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { DeliveryPartner } from "../../delivery-partners/entities/delivery-partner.entity";
import { DeliveryAssignment } from "../../delivery-assignments/entities/delivery-assignment.entity";
import { DeliveryPartnerPayout } from "./delivery-partner-payout.entity";

export enum DeliveryPartnerLedgerEntryType {
  DELIVERY_CREDIT = "DELIVERY_CREDIT",
}

/**
 * The delivery-partner equivalent of Module 15's `ledger_entries` — same
 * single-entry, signed-amount bookkeeping (balance = SUM(amount), always
 * derived, never stored). `payoutId` is this module's simplification of
 * Modules 17+18's separate Settlement+Payout chain: there's no
 * commission-split complexity to lock in independently here (a flat rate
 * per delivery, not a computed split), so one Payout does what Settlement
 * and Payout did together for restaurants — sums unsettled entries, stamps
 * them, and executes the transfer, all in one step.
 */
@Entity({ name: "delivery_partner_ledger_entries" })
export class DeliveryPartnerLedgerEntry extends BaseEntity {
  @Column({ name: "delivery_partner_id", type: "uuid" })
  @Index()
  deliveryPartnerId!: string;

  @ManyToOne(() => DeliveryPartner, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "delivery_partner_id" })
  deliveryPartner!: DeliveryPartner;

  @Column({ name: "delivery_assignment_id", type: "uuid", nullable: true })
  deliveryAssignmentId!: string | null;

  @ManyToOne(() => DeliveryAssignment, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "delivery_assignment_id" })
  deliveryAssignment!: DeliveryAssignment | null;

  @Column({ type: "enum", enum: DeliveryPartnerLedgerEntryType })
  type!: DeliveryPartnerLedgerEntryType;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  amount!: string;

  @Column({ type: "varchar", length: 500 })
  description!: string;

  /** Null until a payout run locks this entry in — see the entity doc comment above. */
  @Column({ name: "payout_id", type: "uuid", nullable: true })
  @Index()
  payoutId!: string | null;

  @ManyToOne(() => DeliveryPartnerPayout, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "payout_id" })
  payout!: DeliveryPartnerPayout | null;
}
