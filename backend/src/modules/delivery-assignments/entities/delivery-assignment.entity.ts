import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Order } from "../../orders/entities/order.entity";
import { Restaurant } from "../../restaurants/entities/restaurant.entity";
import { DeliveryPartner } from "../../delivery-partners/entities/delivery-partner.entity";

export enum DeliveryAssignmentStatus {
  ASSIGNED = "ASSIGNED",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  PICKED_UP = "PICKED_UP",
  DELIVERED = "DELIVERED",
}

/**
 * The "delivery leg" of an order — deliberately its OWN lifecycle, separate
 * from Order.status (Module 11). A restaurant can still self-report
 * OUT_FOR_DELIVERY/DELIVERED (e.g. it does its own delivery, or no partner
 * was available); this table tracks the actual partner-driven handoff when
 * one exists, without entangling two already-complex state machines.
 * Not unique on order_id: a REJECTED assignment stays as history and a
 * fresh row is created for the next candidate partner.
 */
@Entity({ name: "delivery_assignments" })
export class DeliveryAssignment extends BaseEntity {
  @Column({ name: "order_id", type: "uuid" })
  @Index()
  orderId!: string;

  @ManyToOne(() => Order, { onDelete: "CASCADE" })
  @JoinColumn({ name: "order_id" })
  order!: Order;

  @Column({ name: "restaurant_id", type: "uuid" })
  @Index()
  restaurantId!: string;

  @ManyToOne(() => Restaurant, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "restaurant_id" })
  restaurant!: Restaurant;

  @Column({ name: "delivery_partner_id", type: "uuid" })
  @Index()
  deliveryPartnerId!: string;

  @ManyToOne(() => DeliveryPartner, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "delivery_partner_id" })
  deliveryPartner!: DeliveryPartner;

  @Column({ type: "enum", enum: DeliveryAssignmentStatus, default: DeliveryAssignmentStatus.ASSIGNED })
  status!: DeliveryAssignmentStatus;

  /** Shown to the customer, entered by the partner at handoff — never trust a "delivered" claim without it. */
  @Column({ name: "delivery_otp", type: "varchar", length: 6 })
  deliveryOtp!: string;

  @Column({ name: "accepted_at", type: "timestamptz", nullable: true })
  acceptedAt!: Date | null;

  @Column({ name: "picked_up_at", type: "timestamptz", nullable: true })
  pickedUpAt!: Date | null;

  @Column({ name: "delivered_at", type: "timestamptz", nullable: true })
  deliveredAt!: Date | null;
}
