import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Module 25: real customer reviews — what every "no fake star ratings
 * anywhere" comment since Module 16 was waiting for. One review per
 * DELIVERED order (never per-product — an order can span multiple products,
 * and a single overall rating per order matches every other snapshot-at-
 * completion pattern in this app), with an optional restaurant response.
 * `restaurant_id` is denormalized from the order at creation time purely so
 * the rating-aggregate queries (`AVG`/`COUNT` grouped by restaurant) never
 * need to join back through `orders`.
 */
export class AddReviews1755960000000 implements MigrationInterface {
  name = "AddReviews1755960000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "reviews" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "order_id" uuid NOT NULL UNIQUE REFERENCES "orders"("id") ON DELETE RESTRICT,
        "customer_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "restaurant_id" uuid NOT NULL REFERENCES "restaurants"("id") ON DELETE CASCADE,
        "rating" smallint NOT NULL CHECK ("rating" BETWEEN 1 AND 5),
        "comment" varchar(1000),
        "restaurant_response" varchar(1000),
        "restaurant_responded_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_reviews_restaurant_id" ON "reviews" ("restaurant_id");`);
    await queryRunner.query(`CREATE INDEX "idx_reviews_customer_id" ON "reviews" ("customer_id");`);

    await queryRunner.query(`
      INSERT INTO "permissions" ("key", "description", "module") VALUES
        ('reviews:read', 'View all customer reviews platform-wide', 'reviews'),
        ('reviews:manage', 'Remove a review (trust & safety moderation)', 'reviews');
    `);
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r."id", p."id" FROM "roles" r CROSS JOIN "permissions" p
      WHERE r."name" = 'ADMIN' AND p."key" IN ('reviews:read', 'reviews:manage');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "role_permissions" WHERE "permission_id" IN (SELECT "id" FROM "permissions" WHERE "key" IN ('reviews:read', 'reviews:manage'));`);
    await queryRunner.query(`DELETE FROM "permissions" WHERE "key" IN ('reviews:read', 'reviews:manage');`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reviews";`);
  }
}
