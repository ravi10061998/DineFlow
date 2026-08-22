import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { DeliveryPartner, DeliveryPartnerStatus } from "./delivery-partner.entity";
import { User } from "../../users/entities/user.entity";

/** Same audit-trail shape as restaurant_status_history — there's no Audit Log module yet. */
@Entity({ name: "delivery_partner_status_history" })
export class DeliveryPartnerStatusHistory extends BaseEntity {
  @Column({ name: "delivery_partner_id", type: "uuid" })
  @Index()
  deliveryPartnerId!: string;

  @ManyToOne(() => DeliveryPartner, { onDelete: "CASCADE" })
  @JoinColumn({ name: "delivery_partner_id" })
  deliveryPartner!: DeliveryPartner;

  @Column({ name: "from_status", type: "enum", enum: DeliveryPartnerStatus })
  fromStatus!: DeliveryPartnerStatus;

  @Column({ name: "to_status", type: "enum", enum: DeliveryPartnerStatus })
  toStatus!: DeliveryPartnerStatus;

  @Column({ type: "varchar", length: 500, nullable: true })
  reason!: string | null;

  @Column({ name: "changed_by_user_id", type: "uuid" })
  changedByUserId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "changed_by_user_id" })
  changedByUser!: User;
}
