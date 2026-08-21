import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { User } from "../../users/entities/user.entity";

export enum AddressLabel {
  HOME = "HOME",
  WORK = "WORK",
  OTHER = "OTHER",
}

/** A customer's saved delivery address. Cart/Orders/Delivery select "deliver to" from this list. */
@Entity({ name: "customer_addresses" })
export class CustomerAddress extends BaseEntity {
  @Column({ name: "user_id", type: "uuid" })
  @Index()
  userId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ type: "enum", enum: AddressLabel, default: AddressLabel.HOME })
  label!: AddressLabel;

  /** Who actually receives the delivery here — may differ from the account owner. */
  @Column({ name: "receiver_name", type: "varchar", length: 255 })
  receiverName!: string;

  @Column({ name: "receiver_phone", type: "varchar", length: 20 })
  receiverPhone!: string;

  @Column({ name: "address_line1", type: "varchar", length: 255 })
  addressLine1!: string;

  @Column({ name: "address_line2", type: "varchar", length: 255, nullable: true })
  addressLine2!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  landmark!: string | null;

  @Column({ type: "varchar", length: 120 })
  city!: string;

  @Column({ type: "varchar", length: 120 })
  state!: string;

  @Column({ name: "postal_code", type: "varchar", length: 20 })
  postalCode!: string;

  @Column({ type: "varchar", length: 2 })
  country!: string;

  @Column({ type: "decimal", precision: 9, scale: 6, nullable: true })
  latitude!: string | null;

  @Column({ type: "decimal", precision: 9, scale: 6, nullable: true })
  longitude!: string | null;

  @Column({ name: "delivery_instructions", type: "varchar", length: 500, nullable: true })
  deliveryInstructions!: string | null;

  @Column({ name: "is_default", type: "boolean", default: false })
  isDefault!: boolean;
}
