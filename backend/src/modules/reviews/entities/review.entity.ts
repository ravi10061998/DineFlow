import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Order } from "../../orders/entities/order.entity";
import { User } from "../../users/entities/user.entity";
import { Restaurant } from "../../restaurants/entities/restaurant.entity";

/**
 * One review per DELIVERED order — an overall rating, not per-product (an
 * order can span multiple products; every other "snapshot at completion"
 * fact in this app is order-level too). `restaurantId` is denormalized from
 * the order at creation time so rating aggregates never join through orders.
 */
@Entity({ name: "reviews" })
export class Review extends BaseEntity {
  @Column({ name: "order_id", type: "uuid", unique: true })
  orderId!: string;

  @ManyToOne(() => Order, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "order_id" })
  order!: Order;

  @Column({ name: "customer_id", type: "uuid" })
  @Index()
  customerId!: string;

  @ManyToOne(() => User, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "customer_id" })
  customer!: User;

  @Column({ name: "restaurant_id", type: "uuid" })
  @Index()
  restaurantId!: string;

  @ManyToOne(() => Restaurant, { onDelete: "CASCADE" })
  @JoinColumn({ name: "restaurant_id" })
  restaurant!: Restaurant;

  @Column({ type: "smallint" })
  rating!: number;

  @Column({ type: "varchar", length: 1000, nullable: true })
  comment!: string | null;

  @Column({ name: "restaurant_response", type: "varchar", length: 1000, nullable: true })
  restaurantResponse!: string | null;

  @Column({ name: "restaurant_responded_at", type: "timestamptz", nullable: true })
  restaurantRespondedAt!: Date | null;
}
