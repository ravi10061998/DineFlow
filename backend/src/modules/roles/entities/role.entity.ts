import { Column, Entity, JoinTable, ManyToMany } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Permission } from "./permission.entity";

/** The 5 roles the platform seeds on first migration — never delete these via the API. */
export enum SystemRoleName {
  ADMIN = "ADMIN",
  RESTAURANT_ADMIN = "RESTAURANT_ADMIN",
  RESTAURANT_STAFF = "RESTAURANT_STAFF",
  CUSTOMER = "CUSTOMER",
  DELIVERY_PARTNER = "DELIVERY_PARTNER",
}

@Entity({ name: "roles" })
export class Role extends BaseEntity {
  @Column({ type: "varchar", length: 100, unique: true })
  name!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  description!: string | null;

  /** True for the 5 seeded roles above — blocks delete/rename via the admin API. */
  @Column({ name: "is_system", type: "boolean", default: false })
  isSystem!: boolean;

  @ManyToMany(() => Permission, (permission) => permission.roles, { cascade: false })
  @JoinTable({
    name: "role_permissions",
    joinColumn: { name: "role_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "permission_id", referencedColumnName: "id" },
  })
  permissions!: Permission[];
}
