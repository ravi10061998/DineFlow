import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Module 27: Analytics — no new tables at all. Every metric is a live
 * aggregate query against Orders/OrderItems/Reviews, exactly the scope
 * `admin-dashboard.controller.ts` flagged back in Module 5 ("this endpoint
 * should grow incrementally ... rather than becoming a dedicated Analytics
 * module prematurely"). Only a permission is new.
 */
export class AddAnalyticsPermission1755980000000 implements MigrationInterface {
  name = "AddAnalyticsPermission1755980000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "permissions" ("key", "description", "module") VALUES
        ('analytics:read', 'View platform-wide revenue/order/rating analytics', 'analytics');
    `);
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r."id", p."id" FROM "roles" r CROSS JOIN "permissions" p
      WHERE r."name" = 'ADMIN' AND p."key" = 'analytics:read';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "role_permissions" WHERE "permission_id" IN (SELECT "id" FROM "permissions" WHERE "key" = 'analytics:read');`);
    await queryRunner.query(`DELETE FROM "permissions" WHERE "key" = 'analytics:read';`);
  }
}
