import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Module 15: ledger_entries — the running per-restaurant balance: what the
 * platform currently owes each restaurant. Single-entry bookkeeping (signed
 * amounts, balance = SUM), event-driven off payment.succeeded (credit) and
 * refund.succeeded (debit) — the same decoupling shape as Module 14's
 * Refunds listening to order.status_changed. Note "Marketplace Split" is
 * already effectively done by Module 5/11's commission snapshot on Order;
 * this is what turns those per-order numbers into a running balance.
 */
export class AddLedger1755780000000 implements MigrationInterface {
  name = "AddLedger1755780000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "ledger_entry_type_enum" AS ENUM ('ORDER_CREDIT', 'REFUND_DEBIT');`);

    await queryRunner.query(`
      CREATE TABLE "ledger_entries" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "restaurant_id" uuid NOT NULL REFERENCES "restaurants"("id") ON DELETE RESTRICT,
        "order_id" uuid REFERENCES "orders"("id") ON DELETE SET NULL,
        "type" "ledger_entry_type_enum" NOT NULL,
        "amount" decimal(10,2) NOT NULL,
        "description" varchar(500) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_ledger_entries_restaurant_id" ON "ledger_entries" ("restaurant_id");`);

    await queryRunner.query(`
      INSERT INTO "permissions" ("key", "description", "module") VALUES
        ('ledger:read', 'View any restaurant''s running account balance', 'ledger');
    `);
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r."id", p."id" FROM "roles" r CROSS JOIN "permissions" p
      WHERE r."name" = 'ADMIN' AND p."key" = 'ledger:read';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "role_permissions" WHERE "permission_id" IN (SELECT "id" FROM "permissions" WHERE "key" = 'ledger:read');`);
    await queryRunner.query(`DELETE FROM "permissions" WHERE "key" = 'ledger:read';`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ledger_entries";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "ledger_entry_type_enum";`);
  }
}
