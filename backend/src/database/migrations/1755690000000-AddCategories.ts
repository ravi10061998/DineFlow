import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Module 6: categories — restaurant-owned menu sections (not a platform-wide
 * cuisine taxonomy for customer browsing/filtering, which is deferred to the
 * Customer module). Unblocks Module 7 (Products), which will FK into this.
 */
export class AddCategories1755690000000 implements MigrationInterface {
  name = "AddCategories1755690000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "restaurant_id" uuid NOT NULL REFERENCES "restaurants"("id") ON DELETE CASCADE,
        "name" varchar(100) NOT NULL,
        "description" varchar(500),
        "sort_order" integer NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_categories_restaurant_name" UNIQUE ("restaurant_id", "name")
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_categories_restaurant_id" ON "categories" ("restaurant_id");`);

    await queryRunner.query(`
      INSERT INTO "permissions" ("key", "description", "module") VALUES
        ('categories:read', 'View any restaurant''s menu categories', 'categories');
    `);

    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r."id", p."id" FROM "roles" r CROSS JOIN "permissions" p
      WHERE r."name" = 'ADMIN' AND p."key" = 'categories:read';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "role_permissions" WHERE "permission_id" IN (SELECT "id" FROM "permissions" WHERE "key" = 'categories:read');`);
    await queryRunner.query(`DELETE FROM "permissions" WHERE "key" = 'categories:read';`);
    await queryRunner.query(`DROP TABLE IF EXISTS "categories";`);
  }
}
