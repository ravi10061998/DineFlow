import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBlogs1755830000000 implements MigrationInterface {
  name = "AddBlogs1755830000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "blog_categories" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(100) NOT NULL,
        "slug" varchar(120) NOT NULL UNIQUE,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "blogs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "title" varchar(200) NOT NULL,
        "slug" varchar(220) NOT NULL UNIQUE,
        "cover_image_url" varchar(500),
        "category_id" uuid REFERENCES "blog_categories"("id") ON DELETE SET NULL,
        "author_name" varchar(150) NOT NULL,
        "excerpt" varchar(500) NOT NULL,
        "content" text NOT NULL,
        "reading_time_minutes" integer NOT NULL DEFAULT 3,
        "is_published" boolean NOT NULL DEFAULT false,
        "published_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_blogs_category_id" ON "blogs" ("category_id");`);

    await queryRunner.query(`
      INSERT INTO "blog_categories" ("name", "slug") VALUES
        ('Food', 'food'),
        ('Recipes', 'recipes'),
        ('Restaurant Guides', 'restaurant-guides'),
        ('Health', 'health'),
        ('Offers', 'offers'),
        ('Local Food', 'local-food'),
        ('Cooking Tips', 'cooking-tips');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "blogs";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "blog_categories";`);
  }
}
