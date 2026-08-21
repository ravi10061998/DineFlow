import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFavorites1755840000000 implements MigrationInterface {
  name = "AddFavorites1755840000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "favorite_target_type_enum" AS ENUM ('RESTAURANT', 'PRODUCT');`);

    await queryRunner.query(`
      CREATE TABLE "favorites" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "target_type" "favorite_target_type_enum" NOT NULL,
        "target_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_favorites_user_target" UNIQUE ("user_id", "target_type", "target_id")
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_favorites_user_id" ON "favorites" ("user_id");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "favorites";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "favorite_target_type_enum";`);
  }
}
