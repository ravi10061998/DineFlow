import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * One row per registered device — a user can have several (phone + tablet,
 * or a reinstall that gets a fresh Expo push token). Unique on the token
 * itself, not (user_id, token): a token belongs to exactly one physical
 * installation, so if a different account logs into the same device, the
 * upsert reassigns user_id to the new owner rather than leaving a stale
 * token pointing at whoever registered it first.
 */
export class AddPushTokens1756000000000 implements MigrationInterface {
  name = "AddPushTokens1756000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ALTER TYPE ... ADD VALUE cannot run inside the same transaction that later
    // references the new value, but simply adding it here (nothing else in this
    // migration inserts a PUSH row) is safe on Postgres 12+.
    await queryRunner.query(`ALTER TYPE "notification_channel_enum" ADD VALUE IF NOT EXISTS 'PUSH';`);

    await queryRunner.query(`
      CREATE TABLE "push_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token" varchar(255) NOT NULL UNIQUE,
        "platform" varchar(20) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_push_tokens_user_id" ON "push_tokens" ("user_id");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "push_tokens";`);
    // Postgres has no DROP VALUE for enums — removing 'PUSH' from
    // notification_channel_enum would require rebuilding the type entirely
    // (create a new type, cast the column, drop the old type). Not attempted
    // here; a rollback leaves the enum value in place, which is harmless.
  }
}
