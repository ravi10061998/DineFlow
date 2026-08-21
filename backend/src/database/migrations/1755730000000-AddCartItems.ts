import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Module 10: cart items — a customer's in-progress order. No separate "cart"
 * header table (nothing to hang off one beyond the items) and deliberately
 * no stored price — a cart is pre-commitment, so line prices are computed
 * live from the current catalog on every read. Price snapshotting happens
 * at Order creation (a later module), not here.
 */
export class AddCartItems1755730000000 implements MigrationInterface {
  name = "AddCartItems1755730000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "cart_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "restaurant_id" uuid NOT NULL REFERENCES "restaurants"("id") ON DELETE CASCADE,
        "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
        "variant_id" uuid REFERENCES "product_variants"("id") ON DELETE CASCADE,
        "addon_ids" jsonb NOT NULL DEFAULT '[]',
        "quantity" integer NOT NULL DEFAULT 1,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_cart_items_user_id" ON "cart_items" ("user_id");`);
    await queryRunner.query(`CREATE INDEX "idx_cart_items_restaurant_id" ON "cart_items" ("restaurant_id");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "cart_items";`);
  }
}
