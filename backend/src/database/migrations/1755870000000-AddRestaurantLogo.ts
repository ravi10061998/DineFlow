import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRestaurantLogo1755870000000 implements MigrationInterface {
  name = "AddRestaurantLogo1755870000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "restaurants"
        ADD COLUMN "logo_path" varchar(500) NULL,
        ADD COLUMN "logo_original_name" varchar(255) NULL,
        ADD COLUMN "logo_mime_type" varchar(100) NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "restaurants"
        DROP COLUMN "logo_path",
        DROP COLUMN "logo_original_name",
        DROP COLUMN "logo_mime_type";
    `);
  }
}
