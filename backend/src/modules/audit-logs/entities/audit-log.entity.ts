import { Column, Entity, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

/**
 * One row per authenticated mutating HTTP request (POST/PUT/PATCH/DELETE,
 * excluding `/auth/*`). `actorEmail`/`actorRole` are snapshots, not FKs —
 * the log must stay readable exactly as it happened regardless of what
 * later happens to the actor's own account.
 */
@Entity({ name: "audit_logs" })
export class AuditLog extends BaseEntity {
  @Column({ name: "actor_user_id", type: "uuid", nullable: true })
  @Index()
  actorUserId!: string | null;

  @Column({ name: "actor_email", type: "varchar", length: 255 })
  actorEmail!: string;

  @Column({ name: "actor_role", type: "varchar", length: 50 })
  actorRole!: string;

  @Column({ type: "varchar", length: 10 })
  method!: string;

  @Column({ type: "varchar", length: 500 })
  path!: string;

  @Column({ type: "boolean" })
  success!: boolean;

  @Column({ name: "error_message", type: "varchar", length: 500, nullable: true })
  errorMessage!: string | null;

  @Column({ name: "ip_address", type: "varchar", length: 45, nullable: true })
  ipAddress!: string | null;

  /** A shallow-redacted snapshot of the request body — passwords/tokens stripped before ever reaching this column. */
  @Column({ type: "jsonb", nullable: true })
  metadata!: Record<string, unknown> | null;
}
