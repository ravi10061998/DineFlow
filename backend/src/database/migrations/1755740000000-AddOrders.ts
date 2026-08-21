import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Module 11: orders — converts a validated cart into an immutable, money-
 * adjacent record. Unlike Cart, everything here is snapshotted (delivery
 * address, item names/prices, commission split) at checkout time, so later
 * catalog/address/commission-rule changes never rewrite history.
 * customer_id/restaurant_id use ON DELETE RESTRICT — financial records must
 * never silently vanish; product_id/variant_id on order_items are nullable
 * SET NULL since Products already supports hard delete.
 */
export class AddOrders1755740000000 implements MigrationInterface {
  name = "AddOrders1755740000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "order_status_enum" AS ENUM (
        'PLACED', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'
      );
    `);
    await queryRunner.query(`CREATE TYPE "order_payment_status_enum" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');`);

    await queryRunner.query(`
      CREATE TABLE "orders" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "order_number" varchar(30) NOT NULL UNIQUE,
        "customer_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "restaurant_id" uuid NOT NULL REFERENCES "restaurants"("id") ON DELETE RESTRICT,
        "delivery_address_id" uuid REFERENCES "customer_addresses"("id") ON DELETE SET NULL,
        "delivery_receiver_name" varchar(255) NOT NULL,
        "delivery_receiver_phone" varchar(20) NOT NULL,
        "delivery_address_line1" varchar(255) NOT NULL,
        "delivery_address_line2" varchar(255),
        "delivery_landmark" varchar(255),
        "delivery_city" varchar(120) NOT NULL,
        "delivery_state" varchar(120) NOT NULL,
        "delivery_postal_code" varchar(20) NOT NULL,
        "delivery_country" varchar(2) NOT NULL,
        "subtotal" decimal(10,2) NOT NULL,
        "commission_amount" decimal(10,2) NOT NULL,
        "restaurant_payout_amount" decimal(10,2) NOT NULL,
        "total_amount" decimal(10,2) NOT NULL,
        "status" "order_status_enum" NOT NULL DEFAULT 'PLACED',
        "payment_status" "order_payment_status_enum" NOT NULL DEFAULT 'PENDING',
        "cancellation_reason" varchar(500),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_orders_customer_id" ON "orders" ("customer_id");`);
    await queryRunner.query(`CREATE INDEX "idx_orders_restaurant_id" ON "orders" ("restaurant_id");`);

    await queryRunner.query(`
      CREATE TABLE "order_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
        "product_id" uuid REFERENCES "products"("id") ON DELETE SET NULL,
        "product_name" varchar(150) NOT NULL,
        "variant_id" uuid REFERENCES "product_variants"("id") ON DELETE SET NULL,
        "variant_name" varchar(100),
        "addons" jsonb NOT NULL DEFAULT '[]',
        "unit_price" decimal(10,2) NOT NULL,
        "quantity" integer NOT NULL,
        "line_total" decimal(10,2) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_order_items_order_id" ON "order_items" ("order_id");`);

    await queryRunner.query(`
      CREATE TABLE "order_status_history" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
        "from_status" "order_status_enum",
        "to_status" "order_status_enum" NOT NULL,
        "changed_by_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "reason" varchar(500),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_order_status_history_order_id" ON "order_status_history" ("order_id");`);

    await queryRunner.query(`
      INSERT INTO "permissions" ("key", "description", "module") VALUES
        ('orders:read', 'View any restaurant''s orders', 'orders');
    `);
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r."id", p."id" FROM "roles" r CROSS JOIN "permissions" p
      WHERE r."name" = 'ADMIN' AND p."key" = 'orders:read';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "role_permissions" WHERE "permission_id" IN (SELECT "id" FROM "permissions" WHERE "key" = 'orders:read');`);
    await queryRunner.query(`DELETE FROM "permissions" WHERE "key" = 'orders:read';`);
    await queryRunner.query(`DROP TABLE IF EXISTS "order_status_history";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "order_items";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "orders";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "order_payment_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "order_status_enum";`);
  }
}
