import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { User } from "../../users/entities/user.entity";

@Entity({ name: "refresh_tokens" })
export class RefreshToken extends BaseEntity {
  @Column({ name: "user_id", type: "uuid" })
  @Index()
  userId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  /** SHA-256 hash of the opaque token handed to the client — never store it raw. */
  @Column({ name: "token_hash", type: "varchar", length: 255, unique: true })
  tokenHash!: string;

  /** Links a chain of rotated tokens; reusing a revoked token revokes the whole family. */
  @Column({ name: "family_id", type: "uuid" })
  @Index()
  familyId!: string;

  @Column({ name: "user_agent", type: "varchar", length: 255, nullable: true })
  userAgent!: string | null;

  @Column({ name: "ip_address", type: "varchar", length: 64, nullable: true })
  ipAddress!: string | null;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt!: Date;

  @Column({ name: "revoked_at", type: "timestamptz", nullable: true })
  revokedAt!: Date | null;
}
