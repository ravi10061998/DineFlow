import { Column, Entity, Index, JoinColumn, OneToOne } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { User } from "../../users/entities/user.entity";

export enum Gender {
  MALE = "MALE",
  FEMALE = "FEMALE",
  OTHER = "OTHER",
  PREFER_NOT_TO_SAY = "PREFER_NOT_TO_SAY",
}

/**
 * 1:1 extension of `users` for CUSTOMER-only fields — kept as its own table
 * rather than columns on `users` (same reasoning as `restaurants` having its
 * own table), and created lazily on first profile access/update rather than
 * at registration time, so `auth.service.ts` stays untouched.
 */
@Entity({ name: "customer_profiles" })
export class CustomerProfile extends BaseEntity {
  @Column({ name: "user_id", type: "uuid", unique: true })
  @Index()
  userId!: string;

  @OneToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ name: "date_of_birth", type: "date", nullable: true })
  dateOfBirth!: string | null;

  @Column({ type: "enum", enum: Gender, nullable: true })
  gender!: Gender | null;

  @Column({ name: "profile_photo_path", type: "varchar", length: 500, nullable: true })
  profilePhotoPath!: string | null;

  @Column({ name: "profile_photo_original_name", type: "varchar", length: 255, nullable: true })
  profilePhotoOriginalName!: string | null;

  @Column({ name: "profile_photo_mime_type", type: "varchar", length: 100, nullable: true })
  profilePhotoMimeType!: string | null;
}
