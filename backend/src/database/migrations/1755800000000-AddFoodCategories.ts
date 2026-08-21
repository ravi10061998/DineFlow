import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Customer Home Page module: food_categories — a platform-wide browsing
 * taxonomy (Pizza, Burger, Biryani, ...), distinct from Module 6's
 * restaurant-owned `categories` (each restaurant's own private menu
 * sections). This is exactly the "cuisine taxonomy for customer browsing"
 * Module 6's own notes deferred to this module.
 */
export class AddFoodCategories1755800000000 implements MigrationInterface {
  name = "AddFoodCategories1755800000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "food_categories" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(100) NOT NULL,
        "slug" varchar(120) NOT NULL UNIQUE,
        "image_url" varchar(500),
        "sort_order" integer NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      INSERT INTO "food_categories" ("name", "slug", "sort_order") VALUES
        ('Pizza', 'pizza', 0),
        ('Burger', 'burger', 1),
        ('Biryani', 'biryani', 2),
        ('Chinese', 'chinese', 3),
        ('South Indian', 'south-indian', 4),
        ('North Indian', 'north-indian', 5),
        ('Desserts', 'desserts', 6),
        ('Drinks', 'drinks', 7),
        ('Healthy', 'healthy', 8),
        ('Fast Food', 'fast-food', 9),
        ('Thali', 'thali', 10),
        ('Snacks', 'snacks', 11);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "food_categories";`);
  }
}
