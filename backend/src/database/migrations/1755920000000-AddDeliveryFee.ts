import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Module 21: delivery_fee_settings (a single-row platform config, same
 * pattern as Module 4's trial_settings) plus delivery_fee/delivery_distance_km
 * snapshot columns on orders. Closes the TODO Module 11's own Order entity
 * comment left open: "= subtotal today — delivery fee ... will extend this later."
 */
export class AddDeliveryFee1755920000000 implements MigrationInterface {
  name = "AddDeliveryFee1755920000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "delivery_fee_settings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "base_fee" decimal(10,2) NOT NULL DEFAULT 20,
        "per_km_rate" decimal(10,2) NOT NULL DEFAULT 8,
        "free_delivery_above_amount" decimal(10,2),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    // Seed the one and only row — ₹20 base + ₹8/km, free above ₹500, sensible illustrative defaults.
    await queryRunner.query(`
      INSERT INTO "delivery_fee_settings" ("base_fee", "per_km_rate", "free_delivery_above_amount")
      VALUES (20.00, 8.00, 500.00);
    `);

    await queryRunner.query(`
      ALTER TABLE "orders"
        ADD COLUMN "delivery_fee" decimal(10,2) NOT NULL DEFAULT 0,
        ADD COLUMN "delivery_distance_km" decimal(6,2);
    `);

    await queryRunner.query(`
      INSERT INTO "permissions" ("key", "description", "module") VALUES
        ('delivery_fee:read', 'View delivery fee settings', 'delivery_fee'),
        ('delivery_fee:manage', 'Change delivery fee settings', 'delivery_fee');
    `);
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r."id", p."id" FROM "roles" r CROSS JOIN "permissions" p
      WHERE r."name" = 'ADMIN' AND p."key" IN ('delivery_fee:read', 'delivery_fee:manage');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "role_permissions" WHERE "permission_id" IN (SELECT "id" FROM "permissions" WHERE "key" IN ('delivery_fee:read', 'delivery_fee:manage'));`);
    await queryRunner.query(`DELETE FROM "permissions" WHERE "key" IN ('delivery_fee:read', 'delivery_fee:manage');`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "delivery_fee", DROP COLUMN "delivery_distance_km";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "delivery_fee_settings";`);
  }
}
