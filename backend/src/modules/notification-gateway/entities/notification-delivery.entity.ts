import { Column, Entity, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

export enum NotificationChannel {
  EMAIL = "EMAIL",
  SMS = "SMS",
}

export enum NotificationDeliveryStatus {
  SENT = "SENT",
  FAILED = "FAILED",
}

/** One row per attempted send — the audit trail a real email/SMS provider's dashboard would otherwise be the only record of. */
@Entity({ name: "notification_deliveries" })
export class NotificationDelivery extends BaseEntity {
  @Column({ type: "enum", enum: NotificationChannel })
  channel!: NotificationChannel;

  @Column({ type: "varchar", length: 255 })
  recipient!: string;

  @Column({ type: "varchar", length: 200, nullable: true })
  subject!: string | null;

  @Column({ type: "varchar", length: 2000 })
  body!: string;

  @Column({ type: "enum", enum: NotificationDeliveryStatus })
  status!: NotificationDeliveryStatus;

  /** e.g. "EMAIL_VERIFICATION" / "PASSWORD_RESET" / "TRIAL_REMINDER" / "ORDER_UPDATE" / "PAYMENT_SUCCEEDED" / "REFUND_SUCCEEDED" — free-form, not an FK. */
  @Column({ name: "related_type", type: "varchar", length: 50, nullable: true })
  @Index()
  relatedType!: string | null;

  @Column({ name: "related_id", type: "uuid", nullable: true })
  relatedId!: string | null;
}
