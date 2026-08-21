import { Column, Entity } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

export enum RestaurantStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  SUSPENDED = "SUSPENDED",
  BLOCKED = "BLOCKED",
}

@Entity({ name: "restaurants" })
export class Restaurant extends BaseEntity {
  @Column({ type: "varchar", length: 255 })
  name!: string;

  /** URL-safe, unique, auto-generated from name at registration. Never user-editable directly. */
  @Column({ type: "varchar", length: 280, unique: true })
  slug!: string;

  @Column({ name: "owner_full_name", type: "varchar", length: 255 })
  ownerFullName!: string;

  /** Business contact info — may differ from the owner user's login email later, kept separate on purpose. */
  @Column({ type: "varchar", length: 255 })
  email!: string;

  @Column({ type: "varchar", length: 20 })
  phone!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "enum", enum: RestaurantStatus, default: RestaurantStatus.PENDING })
  status!: RestaurantStatus;

  @Column({ name: "rejection_reason", type: "varchar", length: 500, nullable: true })
  rejectionReason!: string | null;

  @Column({ name: "address_line1", type: "varchar", length: 255 })
  addressLine1!: string;

  @Column({ name: "address_line2", type: "varchar", length: 255, nullable: true })
  addressLine2!: string | null;

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

  @Column({ name: "delivery_radius_km", type: "decimal", precision: 5, scale: 2, default: 5 })
  deliveryRadiusKm!: string;
}
