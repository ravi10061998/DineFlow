import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Module 17: settlements — the periodic step between Ledger (what's owed,
 * a running balance) and Payout (the next module, actually transferring the
 * money). Running a settlement locks in every currently-unsettled ledger
 * entry for a restaurant into one immutable record and stamps those entries
 * with the new settlement's id, so the next run never double-counts them.
 */
export class AddSettlements1755880000000 implements MigrationInterface {
  name = "AddSettlements1755880000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "settlements" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "restaurant_id" uuid NOT NULL REFERENCES "restaurants"("id") ON DELETE RESTRICT,
        "period_start" timestamptz NOT NULL,
        "period_end" timestamptz NOT NULL,
        "amount" decimal(10,2) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_settlements_restaurant_id" ON "settlements" ("restaurant_id");`);

    await queryRunner.query(`
      ALTER TABLE "ledger_entries" ADD COLUMN "settlement_id" uuid NULL REFERENCES "settlements"("id") ON DELETE SET NULL;
    `);
    await queryRunner.query(`CREATE INDEX "idx_ledger_entries_settlement_id" ON "ledger_entries" ("settlement_id");`);

    await queryRunner.query(`
      INSERT INTO "permissions" ("key", "description", "module") VALUES
        ('ledger:manage', 'Trigger settlement runs for a restaurant', 'ledger');
    `);
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r."id", p."id" FROM "roles" r CROSS JOIN "permissions" p
      WHERE r."name" = 'ADMIN' AND p."key" = 'ledger:manage';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "role_permissions" WHERE "permission_id" IN (SELECT "id" FROM "permissions" WHERE "key" = 'ledger:manage');`);
    await queryRunner.query(`DELETE FROM "permissions" WHERE "key" = 'ledger:manage';`);
    await queryRunner.query(`ALTER TABLE "ledger_entries" DROP COLUMN "settlement_id";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "settlements";`);
  }
}
