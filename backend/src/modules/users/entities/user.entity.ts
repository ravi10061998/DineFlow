import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Role } from "../../roles/entities/role.entity";
import { Restaurant } from "../../restaurants/entities/restaurant.entity";

export enum UserStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SUSPENDED = "SUSPENDED",
}

@Entity({ name: "users" })
export class User extends BaseEntity {
  @Column({ type: "varchar", length: 255, unique: true })
  email!: string;

  // Postgres unique constraints permit multiple NULLs, so this stays unique
  // even though most non-customer users will leave phone unset initially.
  @Column({ type: "varchar", length: 20, unique: true, nullable: true })
  phone!: string | null;

  @Column({ name: "password_hash", type: "varchar", length: 255, select: false })
  passwordHash!: string;

  @Column({ name: "full_name", type: "varchar", length: 255 })
  fullName!: string;

  @Column({ type: "enum", enum: UserStatus, default: UserStatus.ACTIVE })
  status!: UserStatus;

  @Column({ name: "role_id", type: "uuid" })
  roleId!: string;

  @ManyToOne(() => Role, { eager: true })
  @JoinColumn({ name: "role_id" })
  role!: Role;

  /**
   * Tenant anchor for RESTAURANT_ADMIN / RESTAURANT_STAFF users.
   * Always read this off the authenticated user (req.user.restaurantId), never off request input.
   */
  @Column({ name: "restaurant_id", type: "uuid", nullable: true })
  restaurantId!: string | null;

  @ManyToOne(() => Restaurant, { nullable: true })
  @JoinColumn({ name: "restaurant_id" })
  restaurant!: Restaurant | null;

  @Column({ name: "email_verified_at", type: "timestamptz", nullable: true })
  emailVerifiedAt!: Date | null;

  @Column({ name: "phone_verified_at", type: "timestamptz", nullable: true })
  phoneVerifiedAt!: Date | null;

  @Column({ name: "last_login_at", type: "timestamptz", nullable: true })
  lastLoginAt!: Date | null;
}
