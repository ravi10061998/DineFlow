import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Coupon } from "./coupon.entity";
import { User } from "../../users/entities/user.entity";
import { Order } from "../../orders/entities/order.entity";

/**
 * One row per successful redemption — what makes per-customer and total
 * usage limits enforceable. `orderId` is unique: a coupon is redeemed at
 * most once per order, created in the SAME transaction as the order itself
 * so a concurrent double-checkout can never redeem past its limits.
 */
@Entity({ name: "coupon_redemptions" })
export class CouponRedemption extends BaseEntity {
  @Column({ name: "coupon_id", type: "uuid" })
  @Index()
  couponId!: string;

  @ManyToOne(() => Coupon, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "coupon_id" })
  coupon!: Coupon;

  @Column({ name: "customer_id", type: "uuid" })
  @Index()
  customerId!: string;

  @ManyToOne(() => User, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "customer_id" })
  customer!: User;

  @Column({ name: "order_id", type: "uuid", unique: true })
  orderId!: string;

  @ManyToOne(() => Order, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "order_id" })
  order!: Order;

  /** Snapshotted — the exact rupee amount this redemption discounted, independent of any later coupon edits. */
  @Column({ name: "discount_amount", type: "decimal", precision: 10, scale: 2 })
  discountAmount!: string;
}
