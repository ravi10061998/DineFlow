import { MigrationInterface, QueryRunner } from "typeorm";

/** Reuses commission_type_enum (PERCENTAGE/FIXED) from Module 5 — same shape, no need for a second enum. */
export class AddOffers1755820000000 implements MigrationInterface {
  name = "AddOffers1755820000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "offers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" varchar(30) NOT NULL UNIQUE,
        "title" varchar(200) NOT NULL,
        "description" varchar(500),
        "discount_type" "commission_type_enum" NOT NULL,
        "discount_value" decimal(10,2) NOT NULL,
        "min_order_amount" decimal(10,2),
        "max_discount_amount" decimal(10,2),
        "expires_at" timestamptz,
        "restaurant_id" uuid REFERENCES "restaurants"("id") ON DELETE CASCADE,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "offers";`);
  }
}
