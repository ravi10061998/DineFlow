import { Column, Entity, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

export enum NotificationType {
  ORDER_UPDATE = "ORDER_UPDATE",
  OFFER = "OFFER",
  ANNOUNCEMENT = "ANNOUNCEMENT",
}

@Entity({ name: "notifications" })
export class Notification extends BaseEntity {
  @Column({ name: "user_id", type: "uuid" })
  @Index()
  userId!: string;

  @Column({ type: "enum", enum: NotificationType })
  type!: NotificationType;

  @Column({ type: "varchar", length: 200 })
  title!: string;

  @Column({ type: "varchar", length: 500 })
  body!: string;

  @Column({ name: "related_order_id", type: "uuid", nullable: true })
  relatedOrderId!: string | null;

  @Column({ name: "is_read", type: "boolean", default: false })
  isRead!: boolean;
}
