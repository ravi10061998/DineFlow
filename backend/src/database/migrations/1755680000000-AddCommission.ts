import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Module 5: commission_rules (restaurant-specific overrides), plus the trial
 * commission columns Module 4's trial_settings should have shipped with
 * (§5 lists "Trial commission rate" as an admin-configurable trial setting).
 * commission_type_enum already exists (created in Module 4's migration) and
 * is reused here — CommissionType's canonical home moved to common/enums but
 * the DB enum itself doesn't need to move.
 */
export class AddCommission1755680000000 implements MigrationInterface {
  name = "AddCommission1755680000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "trial_settings"
      ADD COLUMN "trial_commission_type" "commission_type_enum" NOT NULL DEFAULT 'PERCENTAGE',
      ADD COLUMN "trial_commission_value" decimal(10,2) NOT NULL DEFAULT 0;
    `);

    await queryRunner.query(`
      CREATE TABLE "commission_rules" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "restaurant_id" uuid NOT NULL REFERENCES "restaurants"("id") ON DELETE CASCADE,
        "commission_type" "commission_type_enum" NOT NULL,
        "commission_value" decimal(10,2) NOT NULL,
        "reason" varchar(500) NOT NULL,
        "valid_from" timestamptz,
        "valid_to" timestamptz,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_by_user_id" uuid NOT NULL REFERENCES "users"("id"),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_commission_rules_restaurant_id" ON "commission_rules" ("restaurant_id");`);

    await queryRunner.query(`
      INSERT INTO "permissions" ("key", "description", "module") VALUES
        ('commission:read', 'View commission rules and effective rates', 'commission'),
        ('commission:manage', 'Create and edit restaurant-specific commission overrides', 'commission');
    `);

    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r."id", p."id" FROM "roles" r CROSS JOIN "permissions" p
      WHERE r."name" = 'ADMIN' AND p."key" IN ('commission:read', 'commission:manage');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "role_permissions" WHERE "permission_id" IN (SELECT "id" FROM "permissions" WHERE "key" IN ('commission:read', 'commission:manage'));`);
    await queryRunner.query(`DELETE FROM "permissions" WHERE "key" IN ('commission:read', 'commission:manage');`);
    await queryRunner.query(`DROP TABLE IF EXISTS "commission_rules";`);
    await queryRunner.query(`ALTER TABLE "trial_settings" DROP COLUMN IF EXISTS "trial_commission_value", DROP COLUMN IF EXISTS "trial_commission_type";`);
  }
}
