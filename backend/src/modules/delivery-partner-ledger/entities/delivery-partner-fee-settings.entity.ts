import { Column, Entity } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

/** Single-row platform config, same pattern as delivery_fee_settings/trial_settings. */
@Entity({ name: "delivery_partner_fee_settings" })
export class DeliveryPartnerFeeSettings extends BaseEntity {
  @Column({ name: "per_delivery_rate", type: "decimal", precision: 10, scale: 2, default: 30 })
  perDeliveryRate!: string;
}
