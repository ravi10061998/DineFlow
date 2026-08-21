import { Column, Entity, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

/**
 * Every webhook delivery this app has ever received, valid or not — an
 * audit/debugging trail, same append-only spirit as restaurant_status_history
 * and order_status_history, just logging an EXTERNAL event hitting the system
 * instead of an internal state change. `(gateway, gatewayEventId)` is unique
 * — that constraint is the actual idempotency guard against redelivery, not
 * just documentation of intent.
 */
@Entity({ name: "webhook_events" })
@Index(["gateway", "gatewayEventId"], { unique: true })
export class WebhookEvent extends BaseEntity {
  @Column({ type: "varchar", length: 20 })
  gateway!: string;

  @Column({ name: "gateway_event_id", type: "varchar", length: 100 })
  gatewayEventId!: string;

  @Column({ name: "event_type", type: "varchar", length: 50 })
  eventType!: string;

  @Column({ type: "jsonb" })
  payload!: Record<string, unknown>;

  @Column({ name: "signature_valid", type: "boolean" })
  signatureValid!: boolean;

  @Column({ name: "processed_at", type: "timestamptz", nullable: true })
  processedAt!: Date | null;

  @Column({ name: "processing_error", type: "varchar", length: 500, nullable: true })
  processingError!: string | null;
}
