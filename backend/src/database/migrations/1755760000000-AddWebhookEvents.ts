import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Module 13: webhook_events — every payment-gateway webhook delivery this
 * app has received, valid or not. `(gateway, gateway_event_id)` is unique —
 * that constraint is the real idempotency guard against a gateway
 * redelivering the same event (normal at-least-once delivery semantics),
 * not just a documentation comment.
 */
export class AddWebhookEvents1755760000000 implements MigrationInterface {
  name = "AddWebhookEvents1755760000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "webhook_events" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "gateway" varchar(20) NOT NULL,
        "gateway_event_id" varchar(100) NOT NULL,
        "event_type" varchar(50) NOT NULL,
        "payload" jsonb NOT NULL,
        "signature_valid" boolean NOT NULL,
        "processed_at" timestamptz,
        "processing_error" varchar(500),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_webhook_events_gateway_event_id" UNIQUE ("gateway", "gateway_event_id")
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "webhook_events";`);
  }
}
