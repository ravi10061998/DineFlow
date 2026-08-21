import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { User } from "../../users/entities/user.entity";
import { Restaurant } from "../../restaurants/entities/restaurant.entity";
import { CustomerAddress } from "../../addresses/entities/customer-address.entity";
import { OrderItem } from "./order-item.entity";

export enum OrderStatus {
  PLACED = "PLACED",
  CONFIRMED = "CONFIRMED",
  PREPARING = "PREPARING",
  READY = "READY",
  OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
}

/** Only ever PENDING in this module — real payment integration is Module 17. */
export enum OrderPaymentStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
}

/**
 * A placed order — immutable and money-adjacent, unlike Cart which is
 * deliberately live-priced. Everything needed to reconstruct the order later
 * (prices, commission split, delivery address) is snapshotted here at
 * checkout time, so later catalog/address/commission-rule changes never
 * rewrite history.
 */
@Entity({ name: "orders" })
export class Order extends BaseEntity {
  @Column({ name: "order_number", type: "varchar", length: 30, unique: true })
  orderNumber!: string;

  @Column({ name: "customer_id", type: "uuid" })
  @Index()
  customerId!: string;

  @ManyToOne(() => User, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "customer_id" })
  customer!: User;

  @Column({ name: "restaurant_id", type: "uuid" })
  @Index()
  restaurantId!: string;

  @ManyToOne(() => Restaurant, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "restaurant_id" })
  restaurant!: Restaurant;

  @Column({ name: "delivery_address_id", type: "uuid", nullable: true })
  deliveryAddressId!: string | null;

  @ManyToOne(() => CustomerAddress, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "delivery_address_id" })
  deliveryAddress!: CustomerAddress | null;

  // --- Snapshotted delivery details — never rewritten by a later address edit/delete ---
  @Column({ name: "delivery_receiver_name", type: "varchar", length: 255 })
  deliveryReceiverName!: string;

  @Column({ name: "delivery_receiver_phone", type: "varchar", length: 20 })
  deliveryReceiverPhone!: string;

  @Column({ name: "delivery_address_line1", type: "varchar", length: 255 })
  deliveryAddressLine1!: string;

  @Column({ name: "delivery_address_line2", type: "varchar", length: 255, nullable: true })
  deliveryAddressLine2!: string | null;

  @Column({ name: "delivery_landmark", type: "varchar", length: 255, nullable: true })
  deliveryLandmark!: string | null;

  @Column({ name: "delivery_city", type: "varchar", length: 120 })
  deliveryCity!: string;

  @Column({ name: "delivery_state", type: "varchar", length: 120 })
  deliveryState!: string;

  @Column({ name: "delivery_postal_code", type: "varchar", length: 20 })
  deliveryPostalCode!: string;

  @Column({ name: "delivery_country", type: "varchar", length: 2 })
  deliveryCountry!: string;

  // --- Snapshotted money — see order_items for the per-line snapshot ---
  @Column({ type: "decimal", precision: 10, scale: 2 })
  subtotal!: string;

  @Column({ name: "commission_amount", type: "decimal", precision: 10, scale: 2 })
  commissionAmount!: string;

  @Column({ name: "restaurant_payout_amount", type: "decimal", precision: 10, scale: 2 })
  restaurantPayoutAmount!: string;

  /** = subtotal today — delivery fee (Delivery module) and discounts (Coupons module) will extend this later. */
  @Column({ name: "total_amount", type: "decimal", precision: 10, scale: 2 })
  totalAmount!: string;

  @Column({ type: "enum", enum: OrderStatus, default: OrderStatus.PLACED })
  status!: OrderStatus;

  @Column({ name: "payment_status", type: "enum", enum: OrderPaymentStatus, default: OrderPaymentStatus.PENDING })
  paymentStatus!: OrderPaymentStatus;

  @Column({ name: "cancellation_reason", type: "varchar", length: 500, nullable: true })
  cancellationReason!: string | null;

  @OneToMany(() => OrderItem, (item) => item.order)
  items!: OrderItem[];
}
