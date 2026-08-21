import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRestaurantFeaturedFlag1755860000000 implements MigrationInterface {
  name = "AddRestaurantFeaturedFlag1755860000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "restaurants" ADD COLUMN "is_featured" boolean NOT NULL DEFAULT false;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "restaurants" DROP COLUMN "is_featured";`);
  }
}
