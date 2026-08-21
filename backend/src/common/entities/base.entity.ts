import { CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

/**
 * Shared columns for every entity in the platform.
 * Never remove createdAt/updatedAt — historical/audit requirements across
 * the spec (settlements, ledgers, subscriptions) depend on them existing everywhere.
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
