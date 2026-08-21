import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNotifications1755850000000 implements MigrationInterface {
  name = "AddNotifications1755850000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "notification_type_enum" AS ENUM ('ORDER_UPDATE', 'OFFER', 'ANNOUNCEMENT');`);

    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "type" "notification_type_enum" NOT NULL,
        "title" varchar(200) NOT NULL,
        "body" varchar(500) NOT NULL,
        "related_order_id" uuid,
        "is_read" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_notifications_user_id" ON "notifications" ("user_id");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_type_enum";`);
  }
}
