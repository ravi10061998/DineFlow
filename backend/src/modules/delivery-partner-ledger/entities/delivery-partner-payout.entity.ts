import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { DeliveryPartner } from "../../delivery-partners/entities/delivery-partner.entity";

export enum DeliveryPartnerPayoutStatus {
  SUCCEEDED = "SUCCEEDED",
  FAILED = "FAILED",
}

/**
 * One payout run for a delivery partner — sums every currently-unpaid
 * ledger entry, stamps them with this row's id, and executes the transfer,
 * all in one step (see DeliveryPartnerLedgerEntry's doc comment for why this
 * merges what Modules 17+18 kept separate for restaurants).
 */
@Entity({ name: "delivery_partner_payouts" })
export class DeliveryPartnerPayout extends BaseEntity {
  @Column({ name: "delivery_partner_id", type: "uuid" })
  @Index()
  deliveryPartnerId!: string;

  @ManyToOne(() => DeliveryPartner, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "delivery_partner_id" })
  deliveryPartner!: DeliveryPartner;

  @Column({ name: "period_start", type: "timestamptz" })
  periodStart!: Date;

  @Column({ name: "period_end", type: "timestamptz" })
  periodEnd!: Date;

  @Column({ type: "varchar", length: 20 })
  gateway!: string;

  @Column({ name: "gateway_payout_id", type: "varchar", length: 100, nullable: true })
  gatewayPayoutId!: string | null;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  amount!: string;

  @Column({ type: "enum", enum: DeliveryPartnerPayoutStatus })
  status!: DeliveryPartnerPayoutStatus;

  @Column({ name: "failure_reason", type: "varchar", length: 500, nullable: true })
  failureReason!: string | null;
}
