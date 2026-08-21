import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Module 7: products (menu items) owned by a restaurant, scoped to a category.
 * Each product may have mutually-exclusive variants (e.g. Small/Medium/Large,
 * absolute price) and independent multi-select add-ons (e.g. Extra Cheese,
 * additive price). Product images are stored as a jsonb array on the product
 * row itself (small, unbounded-by-schema list) rather than a join table.
 */
export class AddProducts1755700000000 implements MigrationInterface {
  name = "AddProducts1755700000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "products" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "restaurant_id" uuid NOT NULL REFERENCES "restaurants"("id") ON DELETE CASCADE,
        "category_id" uuid NOT NULL REFERENCES "categories"("id") ON DELETE RESTRICT,
        "name" varchar(150) NOT NULL,
        "description" text,
        "base_price" decimal(10,2) NOT NULL,
        "images" jsonb NOT NULL DEFAULT '[]',
        "sort_order" integer NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "is_available" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_products_restaurant_id" ON "products" ("restaurant_id");`);
    await queryRunner.query(`CREATE INDEX "idx_products_category_id" ON "products" ("category_id");`);

    await queryRunner.query(`
      CREATE TABLE "product_variants" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
        "name" varchar(100) NOT NULL,
        "price" decimal(10,2) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_product_variants_product_id" ON "product_variants" ("product_id");`);

    await queryRunner.query(`
      CREATE TABLE "product_addons" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
        "name" varchar(100) NOT NULL,
        "price" decimal(10,2) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_product_addons_product_id" ON "product_addons" ("product_id");`);

    await queryRunner.query(`
      INSERT INTO "permissions" ("key", "description", "module") VALUES
        ('products:read', 'View any restaurant''s menu products', 'products');
    `);

    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r."id", p."id" FROM "roles" r CROSS JOIN "permissions" p
      WHERE r."name" = 'ADMIN' AND p."key" = 'products:read';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "role_permissions" WHERE "permission_id" IN (SELECT "id" FROM "permissions" WHERE "key" = 'products:read');`);
    await queryRunner.query(`DELETE FROM "permissions" WHERE "key" = 'products:read';`);
    await queryRunner.query(`DROP TABLE IF EXISTS "product_addons";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "product_variants";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "products";`);
  }
}
