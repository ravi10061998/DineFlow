import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Order } from "../../orders/entities/order.entity";
import { Payment } from "../../payments/entities/payment.entity";
import { User } from "../../users/entities/user.entity";

export enum RefundStatus {
  SUCCEEDED = "SUCCEEDED",
  FAILED = "FAILED",
}

/**
 * A refund of a specific successful payment — kept as its own record rather
 * than mutating the Payment row, since a payment succeeding and its later
 * refund are two separate financial events, not one corrected one.
 */
@Entity({ name: "refunds" })
export class Refund extends BaseEntity {
  @Column({ name: "order_id", type: "uuid" })
  @Index()
  orderId!: string;

  @ManyToOne(() => Order, { onDelete: "CASCADE" })
  @JoinColumn({ name: "order_id" })
  order!: Order;

  @Column({ name: "payment_id", type: "uuid" })
  paymentId!: string;

  @ManyToOne(() => Payment, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "payment_id" })
  payment!: Payment;

  @Column({ type: "varchar", length: 20 })
  gateway!: string;

  @Column({ name: "gateway_refund_id", type: "varchar", length: 100, nullable: true })
  gatewayRefundId!: string | null;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  amount!: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  reason!: string | null;

  @Column({ type: "enum", enum: RefundStatus })
  status!: RefundStatus;

  @Column({ name: "initiated_by_user_id", type: "uuid" })
  initiatedByUserId!: string;

  @ManyToOne(() => User, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "initiated_by_user_id" })
  initiatedBy!: User;

  @Column({ name: "failure_reason", type: "varchar", length: 500, nullable: true })
  failureReason!: string | null;
}
