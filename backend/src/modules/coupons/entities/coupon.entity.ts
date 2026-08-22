import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Restaurant } from "../../restaurants/entities/restaurant.entity";
import { CommissionType } from "../../../common/enums/commission-type.enum";

/**
 * A real, redeemable discount code — validated and applied at checkout
 * (unlike `offers`, which is homepage-display-only). Discount is always
 * computed server-side from these fields; a client only ever sends the
 * `code` string.
 */
@Entity({ name: "coupons" })
export class Coupon extends BaseEntity {
  @Column({ type: "varchar", length: 30, unique: true })
  code!: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  description!: string | null;

  @Column({ name: "discount_type", type: "enum", enum: CommissionType })
  discountType!: CommissionType;

  @Column({ name: "discount_value", type: "decimal", precision: 10, scale: 2 })
  discountValue!: string;

  @Column({ name: "min_order_amount", type: "decimal", precision: 10, scale: 2, nullable: true })
  minOrderAmount!: string | null;

  /** Caps a PERCENTAGE discount's rupee value. Ignored for FIXED (the value itself is already a cap). */
  @Column({ name: "max_discount_amount", type: "decimal", precision: 10, scale: 2, nullable: true })
  maxDiscountAmount!: string | null;

  /** Null = platform-wide (usable at checkout from any restaurant); set = only usable against that one restaurant's cart. */
  @Column({ name: "restaurant_id", type: "uuid", nullable: true })
  restaurantId!: string | null;

  @ManyToOne(() => Restaurant, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "restaurant_id" })
  restaurant!: Restaurant | null;

  /** Max times ONE customer may redeem this code. Default 1 — the common "first order" / "one-time" shape. */
  @Column({ name: "per_customer_limit", type: "int", default: 1 })
  perCustomerLimit!: number;

  /** Max total redemptions across ALL customers combined. Null = unlimited. */
  @Column({ name: "total_redemption_limit", type: "int", nullable: true })
  totalRedemptionLimit!: number | null;

  @Column({ name: "starts_at", type: "timestamptz", nullable: true })
  startsAt!: Date | null;

  @Column({ name: "expires_at", type: "timestamptz", nullable: true })
  @Index()
  expiresAt!: Date | null;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive!: boolean;
}
