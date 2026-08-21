import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Restaurant } from "../../restaurants/entities/restaurant.entity";
import { CommissionType } from "../../../common/enums/commission-type.enum";

/**
 * A browsable, admin-managed offer — shown on the homepage with a coupon
 * code. Deliberately NOT wired into checkout discount math yet: redeeming a
 * code during checkout (validating min order, applying the discount, etc.)
 * is the original spec's own separate future Coupons module. This is the
 * "discover and copy a code" half only.
 */
@Entity({ name: "offers" })
export class Offer extends BaseEntity {
  @Column({ type: "varchar", length: 30, unique: true })
  code!: string;

  @Column({ type: "varchar", length: 200 })
  title!: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  description!: string | null;

  @Column({ name: "discount_type", type: "enum", enum: CommissionType })
  discountType!: CommissionType;

  @Column({ name: "discount_value", type: "decimal", precision: 10, scale: 2 })
  discountValue!: string;

  @Column({ name: "min_order_amount", type: "decimal", precision: 10, scale: 2, nullable: true })
  minOrderAmount!: string | null;

  @Column({ name: "max_discount_amount", type: "decimal", precision: 10, scale: 2, nullable: true })
  maxDiscountAmount!: string | null;

  @Column({ name: "expires_at", type: "timestamptz", nullable: true })
  expiresAt!: Date | null;

  /** Null = platform-wide; set = only advertised for one restaurant. */
  @Column({ name: "restaurant_id", type: "uuid", nullable: true })
  restaurantId!: string | null;

  @ManyToOne(() => Restaurant, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "restaurant_id" })
  restaurant!: Restaurant | null;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive!: boolean;
}
