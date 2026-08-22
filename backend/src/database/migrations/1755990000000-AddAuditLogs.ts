import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Module 29: a platform-wide "who did what" trail, distinct from the
 * domain-specific history tables already built (restaurant_status_history,
 * order_status_history, subscription_events, delivery_partner_status_history)
 * — those record a specific entity's own lifecycle; this records every
 * authenticated mutating request, regardless of which module it hit.
 * `actor_email`/`actor_role` are denormalized snapshots (not FKs to `users`)
 * — an audit log must remain readable exactly as it happened even if the
 * actor's account is later renamed, role-changed, or deleted.
 */
export class AddAuditLogs1755990000000 implements MigrationInterface {
  name = "AddAuditLogs1755990000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "actor_user_id" uuid,
        "actor_email" varchar(255) NOT NULL,
        "actor_role" varchar(50) NOT NULL,
        "method" varchar(10) NOT NULL,
        "path" varchar(500) NOT NULL,
        "success" boolean NOT NULL,
        "error_message" varchar(500),
        "ip_address" varchar(45),
        "metadata" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_audit_logs_actor_user_id" ON "audit_logs" ("actor_user_id");`);
    await queryRunner.query(`CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs" ("created_at");`);

    await queryRunner.query(`
      INSERT INTO "permissions" ("key", "description", "module") VALUES
        ('audit_logs:read', 'View the platform-wide who-did-what action trail', 'audit_logs');
    `);
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r."id", p."id" FROM "roles" r CROSS JOIN "permissions" p
      WHERE r."name" = 'ADMIN' AND p."key" = 'audit_logs:read';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "role_permissions" WHERE "permission_id" IN (SELECT "id" FROM "permissions" WHERE "key" = 'audit_logs:read');`);
    await queryRunner.query(`DELETE FROM "permissions" WHERE "key" = 'audit_logs:read';`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs";`);
  }
}
