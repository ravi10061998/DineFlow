import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Order, OrderStatus } from "./order.entity";
import { User } from "../../users/entities/user.entity";

/** Append-only order timeline — same pattern as Module 3's restaurant_status_history. */
@Entity({ name: "order_status_history" })
export class OrderStatusHistory extends BaseEntity {
  @Column({ name: "order_id", type: "uuid" })
  orderId!: string;

  @ManyToOne(() => Order, { onDelete: "CASCADE" })
  @JoinColumn({ name: "order_id" })
  order!: Order;

  @Column({ name: "from_status", type: "enum", enum: OrderStatus, nullable: true })
  fromStatus!: OrderStatus | null;

  @Column({ name: "to_status", type: "enum", enum: OrderStatus })
  toStatus!: OrderStatus;

  @Column({ name: "changed_by_user_id", type: "uuid" })
  changedByUserId!: string;

  @ManyToOne(() => User, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "changed_by_user_id" })
  changedBy!: User;

  @Column({ type: "varchar", length: 500, nullable: true })
  reason!: string | null;
}
