import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Module 18: payouts — the step Settlement (Module 17) deliberately left
 * out: actually executing the transfer for a locked-in settlement. Event-
 * driven off `settlement.created`, same decoupling shape as every other
 * cross-module trigger in this app — Settlements stays unaware Payouts exists.
 */
export class AddPayouts1755890000000 implements MigrationInterface {
  name = "AddPayouts1755890000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "payout_status_enum" AS ENUM ('SUCCEEDED', 'FAILED');`);

    await queryRunner.query(`
      CREATE TABLE "payouts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "settlement_id" uuid NOT NULL UNIQUE REFERENCES "settlements"("id") ON DELETE RESTRICT,
        "restaurant_id" uuid NOT NULL REFERENCES "restaurants"("id") ON DELETE RESTRICT,
        "gateway" varchar(20) NOT NULL,
        "gateway_payout_id" varchar(100),
        "amount" decimal(10,2) NOT NULL,
        "status" "payout_status_enum" NOT NULL,
        "failure_reason" varchar(500),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_payouts_restaurant_id" ON "payouts" ("restaurant_id");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "payouts";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payout_status_enum";`);
  }
}
