import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Module 14: refunds — closes a real gap Orders left open: cancelling a
 * PAID order never triggered any money back to the customer. Refunds is
 * event-driven off `order.status_changed` (see Module 4's identical
 * decoupling pattern for restaurant-approval-starts-a-trial) rather than
 * Orders knowing Refunds exists at all.
 */
export class AddRefunds1755770000000 implements MigrationInterface {
  name = "AddRefunds1755770000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "refund_status_enum" AS ENUM ('SUCCEEDED', 'FAILED');`);

    await queryRunner.query(`
      CREATE TABLE "refunds" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
        "payment_id" uuid NOT NULL REFERENCES "payments"("id") ON DELETE RESTRICT,
        "gateway" varchar(20) NOT NULL,
        "gateway_refund_id" varchar(100),
        "amount" decimal(10,2) NOT NULL,
        "reason" varchar(500),
        "status" "refund_status_enum" NOT NULL,
        "initiated_by_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "failure_reason" varchar(500),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_refunds_order_id" ON "refunds" ("order_id");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "refunds";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "refund_status_enum";`);
  }
}
