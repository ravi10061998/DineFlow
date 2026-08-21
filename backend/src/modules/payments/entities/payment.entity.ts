import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Order } from "../../orders/entities/order.entity";

export enum PaymentStatus {
  CREATED = "CREATED",
  SUCCEEDED = "SUCCEEDED",
  FAILED = "FAILED",
}

/**
 * One payment attempt against an order. Deliberately not unique on order_id —
 * a failed attempt is a legitimate, retryable outcome, not an error state to
 * overwrite. `order.paymentStatus` always reflects the most recent attempt.
 */
@Entity({ name: "payments" })
export class Payment extends BaseEntity {
  @Column({ name: "order_id", type: "uuid" })
  @Index()
  orderId!: string;

  @ManyToOne(() => Order, { onDelete: "CASCADE" })
  @JoinColumn({ name: "order_id" })
  order!: Order;

  /** "MOCK" today — swapping in a real gateway (Razorpay/Stripe) later only adds a new value here. */
  @Column({ type: "varchar", length: 20 })
  gateway!: string;

  @Column({ name: "gateway_order_id", type: "varchar", length: 100 })
  gatewayOrderId!: string;

  @Column({ name: "gateway_payment_id", type: "varchar", length: 100, nullable: true })
  gatewayPaymentId!: string | null;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  amount!: string;

  @Column({ type: "varchar", length: 3, default: "INR" })
  currency!: string;

  @Column({ type: "enum", enum: PaymentStatus, default: PaymentStatus.CREATED })
  status!: PaymentStatus;

  @Column({ name: "failure_reason", type: "varchar", length: 500, nullable: true })
  failureReason!: string | null;
}
