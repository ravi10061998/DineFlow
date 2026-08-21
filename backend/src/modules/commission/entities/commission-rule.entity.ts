import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { CommissionType } from "../../../common/enums/commission-type.enum";
import { Restaurant } from "../../restaurants/entities/restaurant.entity";
import { User } from "../../users/entities/user.entity";

/**
 * A restaurant-specific override of their plan's commission rate.
 * At most one is `is_active` per restaurant at a time (enforced in the
 * service, not a DB constraint) — creating a new active rule deactivates the
 * prior one rather than deleting it, preserving history the same way
 * Module 3's restaurant_status_history and Module 4's subscription_events do.
 */
@Entity({ name: "commission_rules" })
export class CommissionRule extends BaseEntity {
  @Column({ name: "restaurant_id", type: "uuid" })
  @Index()
  restaurantId!: string;

  @ManyToOne(() => Restaurant, { onDelete: "CASCADE" })
  @JoinColumn({ name: "restaurant_id" })
  restaurant!: Restaurant;

  @Column({ name: "commission_type", type: "enum", enum: CommissionType })
  commissionType!: CommissionType;

  @Column({ name: "commission_value", type: "decimal", precision: 10, scale: 2 })
  commissionValue!: string;

  @Column({ type: "varchar", length: 500 })
  reason!: string;

  @Column({ name: "valid_from", type: "timestamptz", nullable: true })
  validFrom!: Date | null;

  @Column({ name: "valid_to", type: "timestamptz", nullable: true })
  validTo!: Date | null;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive!: boolean;

  @Column({ name: "created_by_user_id", type: "uuid" })
  createdByUserId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "created_by_user_id" })
  createdByUser!: User;
}
