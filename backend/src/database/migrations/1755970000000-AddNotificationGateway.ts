import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Module 26: the real notification-delivery layer — what every "Notifications
 * module (§29) isn't built yet, log so the flow is testable" comment since
 * Module 2 was waiting for. `notification_deliveries` is an audit log of
 * every attempted send (email verification, password reset, trial reminders,
 * order/payment/refund updates), the same "record what actually happened,
 * never assume" pattern as `webhook_events`/`payments`/`payouts`.
 */
export class AddNotificationGateway1755970000000 implements MigrationInterface {
  name = "AddNotificationGateway1755970000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "notification_channel_enum" AS ENUM ('EMAIL', 'SMS');`);
    await queryRunner.query(`CREATE TYPE "notification_delivery_status_enum" AS ENUM ('SENT', 'FAILED');`);
    await queryRunner.query(`
      CREATE TABLE "notification_deliveries" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "channel" "notification_channel_enum" NOT NULL,
        "recipient" varchar(255) NOT NULL,
        "subject" varchar(200),
        "body" varchar(2000) NOT NULL,
        "status" "notification_delivery_status_enum" NOT NULL,
        "related_type" varchar(50),
        "related_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_notification_deliveries_related" ON "notification_deliveries" ("related_type", "related_id");`);

    await queryRunner.query(`
      INSERT INTO "permissions" ("key", "description", "module") VALUES
        ('notification_deliveries:read', 'View the platform-wide email/SMS delivery log', 'notification_deliveries');
    `);
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r."id", p."id" FROM "roles" r CROSS JOIN "permissions" p
      WHERE r."name" = 'ADMIN' AND p."key" = 'notification_deliveries:read';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "role_permissions" WHERE "permission_id" IN (SELECT "id" FROM "permissions" WHERE "key" = 'notification_deliveries:read');`);
    await queryRunner.query(`DELETE FROM "permissions" WHERE "key" = 'notification_deliveries:read';`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_deliveries";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_delivery_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_channel_enum";`);
  }
}
