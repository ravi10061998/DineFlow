import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Customer Home Page module: `content:read`/`content:manage` are shared
 * across every new homepage-content admin controller (Food Categories,
 * Banners, Offers, Blogs, Restaurant featured-flag) rather than a separate
 * permission pair per content type — these are all "manage the homepage"
 * concerns, conceptually one admin capability.
 */
export class AddContentPermissions1755790000000 implements MigrationInterface {
  name = "AddContentPermissions1755790000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "permissions" ("key", "description", "module") VALUES
        ('content:read', 'View homepage content (banners, categories, offers, blogs)', 'content'),
        ('content:manage', 'Manage homepage content (banners, categories, offers, blogs)', 'content');
    `);
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r."id", p."id" FROM "roles" r CROSS JOIN "permissions" p
      WHERE r."name" = 'ADMIN' AND p."key" IN ('content:read', 'content:manage');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "role_permissions" WHERE "permission_id" IN (SELECT "id" FROM "permissions" WHERE "key" IN ('content:read', 'content:manage'));`,
    );
    await queryRunner.query(`DELETE FROM "permissions" WHERE "key" IN ('content:read', 'content:manage');`);
  }
}
