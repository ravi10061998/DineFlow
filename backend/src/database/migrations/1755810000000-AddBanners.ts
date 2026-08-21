import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBanners1755810000000 implements MigrationInterface {
  name = "AddBanners1755810000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "banners" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "title" varchar(200) NOT NULL,
        "subtitle" varchar(300),
        "image_url" varchar(500) NOT NULL,
        "cta_label" varchar(50),
        "cta_url" varchar(500),
        "start_date" timestamptz,
        "end_date" timestamptz,
        "sort_order" integer NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "banners";`);
  }
}
