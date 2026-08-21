import { Column, Entity, ManyToMany } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Role } from "./role.entity";

@Entity({ name: "permissions" })
export class Permission extends BaseEntity {
  /** Stable machine key, e.g. "restaurants:approve", "orders:read". Never renamed once shipped. */
  @Column({ type: "varchar", length: 150, unique: true })
  key!: string;

  @Column({ type: "varchar", length: 255 })
  description!: string;

  /** Groups permissions for the admin UI, e.g. "restaurants", "orders", "payments". */
  @Column({ type: "varchar", length: 100 })
  module!: string;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles!: Role[];
}
