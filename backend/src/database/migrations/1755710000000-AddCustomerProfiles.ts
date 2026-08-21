import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Module 8: customer profiles — a 1:1 extension of `users` for CUSTOMER-only
 * fields (date of birth, gender, profile photo). Registration/login already
 * work today via the existing `/auth/register` + `/auth/login` endpoints
 * (they default new signups to the CUSTOMER role); this only adds what's
 * genuinely missing: a place to store/edit profile extras. The row is
 * created lazily by the application on first access, not by this migration.
 */
export class AddCustomerProfiles1755710000000 implements MigrationInterface {
  name = "AddCustomerProfiles1755710000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "customer_gender_enum" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');`);

    await queryRunner.query(`
      CREATE TABLE "customer_profiles" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
        "date_of_birth" date,
        "gender" "customer_gender_enum",
        "profile_photo_path" varchar(500),
        "profile_photo_original_name" varchar(255),
        "profile_photo_mime_type" varchar(100),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_profiles";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "customer_gender_enum";`);
  }
}
