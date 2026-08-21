import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Module 2: users, roles, permissions, role_permissions, refresh_tokens,
 * verification_tokens — plus seed data for the 5 system roles and the
 * baseline permission set this module ships with.
 *
 * Written as raw SQL rather than the QueryBuilder schema API for full
 * control over enums, the join table, and seed inserts in one migration.
 */
export class InitAuthSchema1755650000000 implements MigrationInterface {
  name = "InitAuthSchema1755650000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    await queryRunner.query(`CREATE TYPE "user_status_enum" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');`);
    await queryRunner.query(
      `CREATE TYPE "verification_token_type_enum" AS ENUM ('EMAIL_VERIFICATION', 'PHONE_VERIFICATION', 'PASSWORD_RESET');`,
    );

    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(100) NOT NULL UNIQUE,
        "description" varchar(255),
        "is_system" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "permissions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "key" varchar(150) NOT NULL UNIQUE,
        "description" varchar(255) NOT NULL,
        "module" varchar(100) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "role_permissions" (
        "role_id" uuid NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
        "permission_id" uuid NOT NULL REFERENCES "permissions"("id") ON DELETE CASCADE,
        PRIMARY KEY ("role_id", "permission_id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" varchar(255) NOT NULL UNIQUE,
        "phone" varchar(20) UNIQUE,
        "password_hash" varchar(255) NOT NULL,
        "full_name" varchar(255) NOT NULL,
        "status" "user_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "role_id" uuid NOT NULL REFERENCES "roles"("id"),
        "restaurant_id" uuid,
        "email_verified_at" timestamptz,
        "phone_verified_at" timestamptz,
        "last_login_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_users_role_id" ON "users" ("role_id");`);
    await queryRunner.query(`CREATE INDEX "idx_users_restaurant_id" ON "users" ("restaurant_id");`);

    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token_hash" varchar(255) NOT NULL UNIQUE,
        "family_id" uuid NOT NULL,
        "user_agent" varchar(255),
        "ip_address" varchar(64),
        "expires_at" timestamptz NOT NULL,
        "revoked_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_refresh_tokens_user_id" ON "refresh_tokens" ("user_id");`);
    await queryRunner.query(`CREATE INDEX "idx_refresh_tokens_family_id" ON "refresh_tokens" ("family_id");`);

    await queryRunner.query(`
      CREATE TABLE "verification_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "type" "verification_token_type_enum" NOT NULL,
        "token_hash" varchar(255) NOT NULL UNIQUE,
        "expires_at" timestamptz NOT NULL,
        "used_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_verification_tokens_user_id" ON "verification_tokens" ("user_id");`);

    // --- Seed data -------------------------------------------------------

    await queryRunner.query(`
      INSERT INTO "permissions" ("key", "description", "module") VALUES
        ('users:read', 'View platform users', 'users'),
        ('users:manage', 'Activate/deactivate users and assign roles', 'users'),
        ('roles:read', 'View roles and permissions', 'roles'),
        ('roles:manage', 'Create/edit/delete roles and assign permissions', 'roles');
    `);

    await queryRunner.query(`
      INSERT INTO "roles" ("name", "description", "is_system") VALUES
        ('ADMIN', 'Platform administrator', true),
        ('RESTAURANT_ADMIN', 'Restaurant owner/manager', true),
        ('RESTAURANT_STAFF', 'Restaurant staff member', true),
        ('CUSTOMER', 'End customer', true),
        ('DELIVERY_PARTNER', 'Delivery partner', true);
    `);

    // ADMIN gets every permission that exists as of this migration.
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r."id", p."id" FROM "roles" r CROSS JOIN "permissions" p WHERE r."name" = 'ADMIN';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "verification_tokens";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "role_permissions";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "permissions";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "roles";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "verification_token_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_status_enum";`);
  }
}
