import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Module 12: payments — one row per payment attempt against an order (not
 * unique on order_id; a failed attempt is a legitimate, retryable outcome).
 * Backed by a mock gateway today (no real gateway credentials in this dev
 * environment), shaped exactly like a real Razorpay/Stripe integration would
 * be so swapping one in later doesn't touch this schema.
 */
export class AddPayments1755750000000 implements MigrationInterface {
  name = "AddPayments1755750000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "payment_status_enum" AS ENUM ('CREATED', 'SUCCEEDED', 'FAILED');`);

    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
        "gateway" varchar(20) NOT NULL,
        "gateway_order_id" varchar(100) NOT NULL,
        "gateway_payment_id" varchar(100),
        "amount" decimal(10,2) NOT NULL,
        "currency" varchar(3) NOT NULL DEFAULT 'INR',
        "status" "payment_status_enum" NOT NULL DEFAULT 'CREATED',
        "failure_reason" varchar(500),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_payments_order_id" ON "payments" ("order_id");`);

    await queryRunner.query(`
      INSERT INTO "permissions" ("key", "description", "module") VALUES
        ('payments:read', 'View any customer''s payment attempts', 'payments');
    `);
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r."id", p."id" FROM "roles" r CROSS JOIN "permissions" p
      WHERE r."name" = 'ADMIN' AND p."key" = 'payments:read';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "role_permissions" WHERE "permission_id" IN (SELECT "id" FROM "permissions" WHERE "key" = 'payments:read');`);
    await queryRunner.query(`DELETE FROM "permissions" WHERE "key" = 'payments:read';`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payments";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payment_status_enum";`);
  }
}
