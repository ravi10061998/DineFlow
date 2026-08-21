import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Module 4: subscription_plans, trial_settings (single seeded row),
 * restaurant_subscriptions, subscription_events — plus subscriptions:*
 * permissions granted to ADMIN, and the spec's own BASIC/PRO/PREMIUM
 * example plans seeded so the system is immediately exercisable.
 */
export class AddSubscriptions1755670000000 implements MigrationInterface {
  name = "AddSubscriptions1755670000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "billing_interval_enum" AS ENUM ('MONTHLY', 'YEARLY', 'CUSTOM');`);
    await queryRunner.query(`CREATE TYPE "commission_type_enum" AS ENUM ('PERCENTAGE', 'FIXED');`);
    await queryRunner.query(
      `CREATE TYPE "subscription_status_enum" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED', 'SUSPENDED');`,
    );
    await queryRunner.query(`
      CREATE TYPE "subscription_event_type_enum" AS ENUM (
        'TRIAL_STARTED', 'TRIAL_REMINDER_SENT', 'TRIAL_EXPIRED',
        'SUBSCRIBED', 'PLAN_CHANGED', 'CANCELLED', 'EXPIRED'
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "subscription_plans" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(100) NOT NULL,
        "description" text,
        "billing_interval" "billing_interval_enum" NOT NULL,
        "price" decimal(10,2) NOT NULL,
        "commission_type" "commission_type_enum" NOT NULL,
        "commission_value" decimal(10,2) NOT NULL,
        "features" jsonb NOT NULL DEFAULT '[]',
        "limits" jsonb NOT NULL DEFAULT '{}',
        "is_active" boolean NOT NULL DEFAULT true,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "trial_settings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "is_enabled" boolean NOT NULL DEFAULT true,
        "trial_duration_days" integer NOT NULL DEFAULT 60,
        "reminder_schedule_days" jsonb NOT NULL DEFAULT '[30, 15, 7, 3, 1]',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "restaurant_subscriptions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "restaurant_id" uuid NOT NULL UNIQUE REFERENCES "restaurants"("id") ON DELETE CASCADE,
        "status" "subscription_status_enum" NOT NULL,
        "plan_id" uuid REFERENCES "subscription_plans"("id"),
        "trial_started_at" timestamptz,
        "trial_ends_at" timestamptz,
        "current_period_start" timestamptz,
        "current_period_end" timestamptz,
        "price_snapshot" decimal(10,2),
        "commission_type_snapshot" "commission_type_enum",
        "commission_value_snapshot" decimal(10,2),
        "cancelled_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_restaurant_subscriptions_status" ON "restaurant_subscriptions" ("status");`);

    await queryRunner.query(`
      CREATE TABLE "subscription_events" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "restaurant_id" uuid NOT NULL REFERENCES "restaurants"("id") ON DELETE CASCADE,
        "subscription_id" uuid NOT NULL REFERENCES "restaurant_subscriptions"("id") ON DELETE CASCADE,
        "type" "subscription_event_type_enum" NOT NULL,
        "metadata" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_subscription_events_restaurant_id" ON "subscription_events" ("restaurant_id");`);
    await queryRunner.query(`CREATE INDEX "idx_subscription_events_subscription_id" ON "subscription_events" ("subscription_id");`);

    // --- Seed data -----------------------------------------------------

    await queryRunner.query(`INSERT INTO "trial_settings" DEFAULT VALUES;`);

    await queryRunner.query(`
      INSERT INTO "subscription_plans"
        ("name", "billing_interval", "price", "commission_type", "commission_value", "sort_order") VALUES
        ('BASIC', 'MONTHLY', 999, 'PERCENTAGE', 10, 1),
        ('PRO', 'MONTHLY', 1999, 'PERCENTAGE', 5, 2),
        ('PREMIUM', 'MONTHLY', 2999, 'PERCENTAGE', 0, 3);
    `);

    await queryRunner.query(`
      INSERT INTO "permissions" ("key", "description", "module") VALUES
        ('subscriptions:read', 'View subscription plans, trial settings and restaurant subscriptions', 'subscriptions'),
        ('subscriptions:manage', 'Manage subscription plans and trial settings', 'subscriptions');
    `);

    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r."id", p."id" FROM "roles" r CROSS JOIN "permissions" p
      WHERE r."name" = 'ADMIN' AND p."key" IN ('subscriptions:read', 'subscriptions:manage');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "role_permissions" WHERE "permission_id" IN (SELECT "id" FROM "permissions" WHERE "key" IN ('subscriptions:read', 'subscriptions:manage'));`);
    await queryRunner.query(`DELETE FROM "permissions" WHERE "key" IN ('subscriptions:read', 'subscriptions:manage');`);

    await queryRunner.query(`DROP TABLE IF EXISTS "subscription_events";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "restaurant_subscriptions";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trial_settings";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "subscription_plans";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "subscription_event_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "subscription_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "commission_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "billing_interval_enum";`);
  }
}
