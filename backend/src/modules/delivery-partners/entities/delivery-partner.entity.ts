import { Column, Entity, Index, JoinColumn, OneToOne } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { User } from "../../users/entities/user.entity";

export enum DeliveryPartnerStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  SUSPENDED = "SUSPENDED",
  BLOCKED = "BLOCKED",
}

export enum VehicleType {
  BICYCLE = "BICYCLE",
  BIKE = "BIKE",
  SCOOTER = "SCOOTER",
  CAR = "CAR",
}

/**
 * 1:1 extension of `users` for DELIVERY_PARTNER-only fields — same reasoning
 * as `customer_profiles`, not `restaurants`: a delivery partner IS one
 * person, not an organization with staff, so there's no restaurant-style
 * "users.delivery_partner_id owns many staff" relationship to build.
 * Created atomically at registration (like Restaurant), not lazily on first
 * access (unlike CustomerProfile) — a delivery partner without this row
 * makes no sense, there's no bare "just the role" state to support.
 */
@Entity({ name: "delivery_partners" })
export class DeliveryPartner extends BaseEntity {
  @Column({ name: "user_id", type: "uuid", unique: true })
  @Index()
  userId!: string;

  @OneToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ name: "vehicle_type", type: "enum", enum: VehicleType })
  vehicleType!: VehicleType;

  @Column({ name: "vehicle_number", type: "varchar", length: 20 })
  vehicleNumber!: string;

  @Column({ name: "license_number", type: "varchar", length: 50 })
  licenseNumber!: string;

  @Column({ type: "enum", enum: DeliveryPartnerStatus, default: DeliveryPartnerStatus.PENDING })
  status!: DeliveryPartnerStatus;

  @Column({ name: "rejection_reason", type: "varchar", length: 500, nullable: true })
  rejectionReason!: string | null;

  /** Whether the partner is currently accepting deliveries — only meaningful once APPROVED. */
  @Column({ name: "is_online", type: "boolean", default: false })
  isOnline!: boolean;

  /** Last-reported live location — nullable until the partner's app has sent one. Feeds Delivery Assignment/Tracking, a later module. */
  @Column({ name: "current_latitude", type: "decimal", precision: 9, scale: 6, nullable: true })
  currentLatitude!: string | null;

  @Column({ name: "current_longitude", type: "decimal", precision: 9, scale: 6, nullable: true })
  currentLongitude!: string | null;
}
