import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Module 3: restaurants, restaurant_documents, restaurant_business_hours,
 * restaurant_holidays, restaurant_status_history — plus the FK from
 * users.restaurant_id (nullable column added in Module 2) to restaurants.id,
 * and the restaurants:* permissions granted to ADMIN.
 */
export class AddRestaurants1755660000000 implements MigrationInterface {
  name = "AddRestaurants1755660000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "restaurant_status_enum" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'BLOCKED');`,
    );
    await queryRunner.query(
      `CREATE TYPE "restaurant_document_type_enum" AS ENUM ('FSSAI_LICENSE', 'GST_CERTIFICATE', 'PAN_CARD', 'BUSINESS_REGISTRATION', 'BANK_PROOF', 'OTHER');`,
    );
    await queryRunner.query(
      `CREATE TYPE "restaurant_document_status_enum" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');`,
    );

    await queryRunner.query(`
      CREATE TABLE "restaurants" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(255) NOT NULL,
        "slug" varchar(280) NOT NULL UNIQUE,
        "owner_full_name" varchar(255) NOT NULL,
        "email" varchar(255) NOT NULL,
        "phone" varchar(20) NOT NULL,
        "description" text,
        "status" "restaurant_status_enum" NOT NULL DEFAULT 'PENDING',
        "rejection_reason" varchar(500),
        "address_line1" varchar(255) NOT NULL,
        "address_line2" varchar(255),
        "city" varchar(120) NOT NULL,
        "state" varchar(120) NOT NULL,
        "postal_code" varchar(20) NOT NULL,
        "country" varchar(2) NOT NULL,
        "latitude" decimal(9,6),
        "longitude" decimal(9,6),
        "delivery_radius_km" decimal(5,2) NOT NULL DEFAULT 5,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_restaurants_status" ON "restaurants" ("status");`);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "fk_users_restaurant_id" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE "restaurant_documents" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "restaurant_id" uuid NOT NULL REFERENCES "restaurants"("id") ON DELETE CASCADE,
        "type" "restaurant_document_type_enum" NOT NULL,
        "file_path" varchar(500) NOT NULL,
        "original_file_name" varchar(255) NOT NULL,
        "mime_type" varchar(100) NOT NULL,
        "file_size_bytes" integer NOT NULL,
        "status" "restaurant_document_status_enum" NOT NULL DEFAULT 'PENDING',
        "rejection_reason" varchar(500),
        "uploaded_by_user_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_restaurant_documents_restaurant_id" ON "restaurant_documents" ("restaurant_id");`);

    await queryRunner.query(`
      CREATE TABLE "restaurant_business_hours" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "restaurant_id" uuid NOT NULL REFERENCES "restaurants"("id") ON DELETE CASCADE,
        "day_of_week" smallint NOT NULL,
        "open_time" time NOT NULL,
        "close_time" time NOT NULL,
        "is_closed" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_restaurant_business_hours_restaurant_id" ON "restaurant_business_hours" ("restaurant_id");`);

    await queryRunner.query(`
      CREATE TABLE "restaurant_holidays" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "restaurant_id" uuid NOT NULL REFERENCES "restaurants"("id") ON DELETE CASCADE,
        "date" date NOT NULL,
        "reason" varchar(255),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_restaurant_holidays_restaurant_id" ON "restaurant_holidays" ("restaurant_id");`);

    await queryRunner.query(`
      CREATE TABLE "restaurant_status_history" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "restaurant_id" uuid NOT NULL REFERENCES "restaurants"("id") ON DELETE CASCADE,
        "from_status" "restaurant_status_enum" NOT NULL,
        "to_status" "restaurant_status_enum" NOT NULL,
        "reason" varchar(500),
        "changed_by_user_id" uuid NOT NULL REFERENCES "users"("id"),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_restaurant_status_history_restaurant_id" ON "restaurant_status_history" ("restaurant_id");`);

    // --- Permissions -------------------------------------------------------

    await queryRunner.query(`
      INSERT INTO "permissions" ("key", "description", "module") VALUES
        ('restaurants:read', 'View restaurants and their documents', 'restaurants'),
        ('restaurants:approve', 'Approve/reject restaurant registrations and documents', 'restaurants'),
        ('restaurants:manage', 'Suspend/block/reinstate restaurants', 'restaurants');
    `);

    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r."id", p."id" FROM "roles" r CROSS JOIN "permissions" p
      WHERE r."name" = 'ADMIN' AND p."key" IN ('restaurants:read', 'restaurants:approve', 'restaurants:manage');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "role_permissions" WHERE "permission_id" IN (SELECT "id" FROM "permissions" WHERE "key" IN ('restaurants:read', 'restaurants:approve', 'restaurants:manage'));`);
    await queryRunner.query(`DELETE FROM "permissions" WHERE "key" IN ('restaurants:read', 'restaurants:approve', 'restaurants:manage');`);

    await queryRunner.query(`DROP TABLE IF EXISTS "restaurant_status_history";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "restaurant_holidays";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "restaurant_business_hours";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "restaurant_documents";`);
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "fk_users_restaurant_id";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "restaurants";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "restaurant_document_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "restaurant_document_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "restaurant_status_enum";`);
  }
}
