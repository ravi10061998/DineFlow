import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Module 23: the delivery partner's own ledger + payout — the last piece of
 * the Delivery cluster. Deliberately a SIMPLER two-table design than
 * Modules 15+17+18's Ledger/Settlement/Payout for restaurants: a flat
 * per-delivery rate has no commission-split complexity to lock in
 * independently of payout, so one `delivery_partner_payouts` row does what
 * Settlement and Payout did together there — sum unsettled ledger entries,
 * stamp them, execute the transfer.
 */
export class AddDeliveryPartnerLedger1755940000000 implements MigrationInterface {
  name = "AddDeliveryPartnerLedger1755940000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "delivery_partner_fee_settings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "per_delivery_rate" decimal(10,2) NOT NULL DEFAULT 30,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`INSERT INTO "delivery_partner_fee_settings" ("per_delivery_rate") VALUES (30.00);`);

    await queryRunner.query(`CREATE TYPE "delivery_partner_payout_status_enum" AS ENUM ('SUCCEEDED', 'FAILED');`);
    await queryRunner.query(`
      CREATE TABLE "delivery_partner_payouts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "delivery_partner_id" uuid NOT NULL REFERENCES "delivery_partners"("id") ON DELETE RESTRICT,
        "period_start" timestamptz NOT NULL,
        "period_end" timestamptz NOT NULL,
        "gateway" varchar(20) NOT NULL,
        "gateway_payout_id" varchar(100),
        "amount" decimal(10,2) NOT NULL,
        "status" "delivery_partner_payout_status_enum" NOT NULL,
        "failure_reason" varchar(500),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_delivery_partner_payouts_partner_id" ON "delivery_partner_payouts" ("delivery_partner_id");`);

    await queryRunner.query(`CREATE TYPE "delivery_partner_ledger_entry_type_enum" AS ENUM ('DELIVERY_CREDIT');`);
    await queryRunner.query(`
      CREATE TABLE "delivery_partner_ledger_entries" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "delivery_partner_id" uuid NOT NULL REFERENCES "delivery_partners"("id") ON DELETE RESTRICT,
        "delivery_assignment_id" uuid REFERENCES "delivery_assignments"("id") ON DELETE SET NULL,
        "type" "delivery_partner_ledger_entry_type_enum" NOT NULL,
        "amount" decimal(10,2) NOT NULL,
        "description" varchar(500) NOT NULL,
        "payout_id" uuid REFERENCES "delivery_partner_payouts"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_delivery_partner_ledger_entries_partner_id" ON "delivery_partner_ledger_entries" ("delivery_partner_id");`);
    await queryRunner.query(`CREATE INDEX "idx_delivery_partner_ledger_entries_payout_id" ON "delivery_partner_ledger_entries" ("payout_id");`);

    await queryRunner.query(`
      INSERT INTO "permissions" ("key", "description", "module") VALUES
        ('delivery_partner_ledger:read', 'View delivery partner balances and payouts', 'delivery_partner_ledger'),
        ('delivery_partner_ledger:manage', 'Trigger delivery partner payout runs', 'delivery_partner_ledger');
    `);
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r."id", p."id" FROM "roles" r CROSS JOIN "permissions" p
      WHERE r."name" = 'ADMIN' AND p."key" IN ('delivery_partner_ledger:read', 'delivery_partner_ledger:manage');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "role_permissions" WHERE "permission_id" IN (SELECT "id" FROM "permissions" WHERE "key" IN ('delivery_partner_ledger:read', 'delivery_partner_ledger:manage'));`);
    await queryRunner.query(`DELETE FROM "permissions" WHERE "key" IN ('delivery_partner_ledger:read', 'delivery_partner_ledger:manage');`);
    await queryRunner.query(`DROP TABLE IF EXISTS "delivery_partner_ledger_entries";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "delivery_partner_ledger_entry_type_enum";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "delivery_partner_payouts";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "delivery_partner_payout_status_enum";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "delivery_partner_fee_settings";`);
  }
}
