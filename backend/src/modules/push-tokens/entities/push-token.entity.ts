import { Column, Entity, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

export enum PushPlatform {
  IOS = "ios",
  ANDROID = "android",
  WEB = "web",
}

/** One row per registered device. See the migration for why this is unique on token alone. */
@Entity({ name: "push_tokens" })
export class PushToken extends BaseEntity {
  @Column({ name: "user_id", type: "uuid" })
  @Index()
  userId!: string;

  @Column({ type: "varchar", length: 255, unique: true })
  token!: string;

  @Column({ type: "varchar", length: 20 })
  platform!: PushPlatform;
}
