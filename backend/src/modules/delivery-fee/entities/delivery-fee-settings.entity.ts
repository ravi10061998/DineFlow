import { Column, Entity } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

/**
 * Single-row platform-wide config, same pattern as Module 4's `trial_settings`
 * — always exactly one row, enforced by the service always reading/updating
 * the first (and only) row, seeded by the migration, never created by callers.
 */
@Entity({ name: "delivery_fee_settings" })
export class DeliveryFeeSettings extends BaseEntity {
  @Column({ name: "base_fee", type: "decimal", precision: 10, scale: 2, default: 20 })
  baseFee!: string;

  @Column({ name: "per_km_rate", type: "decimal", precision: 10, scale: 2, default: 8 })
  perKmRate!: string;

  /** Orders with a subtotal at or above this waive the fee entirely. Null disables the waiver. */
  @Column({ name: "free_delivery_above_amount", type: "decimal", precision: 10, scale: 2, nullable: true })
  freeDeliveryAboveAmount!: string | null;
}
