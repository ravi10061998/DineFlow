import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Module 20: delivery_assignments — the "delivery leg" of an order, matching
 * a READY order to the nearest online/approved delivery partner. Its own
 * lifecycle (ASSIGNED/ACCEPTED/REJECTED/PICKED_UP/DELIVERED), deliberately
 * separate from Order.status (Module 11) — see the entity's own doc comment.
 */
export class AddDeliveryAssignments1755910000000 implements MigrationInterface {
  name = "AddDeliveryAssignments1755910000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "delivery_assignment_status_enum" AS ENUM ('ASSIGNED', 'ACCEPTED', 'REJECTED', 'PICKED_UP', 'DELIVERED');`,
    );

    await queryRunner.query(`
      CREATE TABLE "delivery_assignments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
        "restaurant_id" uuid NOT NULL REFERENCES "restaurants"("id") ON DELETE RESTRICT,
        "delivery_partner_id" uuid NOT NULL REFERENCES "delivery_partners"("id") ON DELETE RESTRICT,
        "status" "delivery_assignment_status_enum" NOT NULL DEFAULT 'ASSIGNED',
        "delivery_otp" varchar(6) NOT NULL,
        "accepted_at" timestamptz,
        "picked_up_at" timestamptz,
        "delivered_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_delivery_assignments_order_id" ON "delivery_assignments" ("order_id");`);
    await queryRunner.query(`CREATE INDEX "idx_delivery_assignments_restaurant_id" ON "delivery_assignments" ("restaurant_id");`);
    await queryRunner.query(`CREATE INDEX "idx_delivery_assignments_partner_id" ON "delivery_assignments" ("delivery_partner_id");`);

    await queryRunner.query(`
      INSERT INTO "permissions" ("key", "description", "module") VALUES
        ('delivery_assignments:read', 'View delivery assignments across all orders', 'delivery_assignments');
    `);
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r."id", p."id" FROM "roles" r CROSS JOIN "permissions" p
      WHERE r."name" = 'ADMIN' AND p."key" = 'delivery_assignments:read';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "role_permissions" WHERE "permission_id" IN (SELECT "id" FROM "permissions" WHERE "key" = 'delivery_assignments:read');`);
    await queryRunner.query(`DELETE FROM "permissions" WHERE "key" = 'delivery_assignments:read';`);
    await queryRunner.query(`DROP TABLE IF EXISTS "delivery_assignments";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "delivery_assignment_status_enum";`);
  }
}
