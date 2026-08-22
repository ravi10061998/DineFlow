import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Module 19: delivery_partners, delivery_partner_status_history — the
 * DELIVERY_PARTNER role (seeded since Module 2) finally gets its own
 * profile/registration/approval, mirroring Module 3's Restaurant shape but
 * as a 1:1 extension of `users` (like customer_profiles) rather than an
 * organization-with-staff, since a delivery partner IS one person.
 */
export class AddDeliveryPartners1755900000000 implements MigrationInterface {
  name = "AddDeliveryPartners1755900000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "delivery_partner_status_enum" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'BLOCKED');`,
    );
    await queryRunner.query(`CREATE TYPE "vehicle_type_enum" AS ENUM ('BICYCLE', 'BIKE', 'SCOOTER', 'CAR');`);

    await queryRunner.query(`
      CREATE TABLE "delivery_partners" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
        "vehicle_type" "vehicle_type_enum" NOT NULL,
        "vehicle_number" varchar(20) NOT NULL,
        "license_number" varchar(50) NOT NULL,
        "status" "delivery_partner_status_enum" NOT NULL DEFAULT 'PENDING',
        "rejection_reason" varchar(500),
        "is_online" boolean NOT NULL DEFAULT false,
        "current_latitude" decimal(9,6),
        "current_longitude" decimal(9,6),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_delivery_partners_status" ON "delivery_partners" ("status");`);

    await queryRunner.query(`
      CREATE TABLE "delivery_partner_status_history" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "delivery_partner_id" uuid NOT NULL REFERENCES "delivery_partners"("id") ON DELETE CASCADE,
        "from_status" "delivery_partner_status_enum" NOT NULL,
        "to_status" "delivery_partner_status_enum" NOT NULL,
        "reason" varchar(500),
        "changed_by_user_id" uuid NOT NULL REFERENCES "users"("id"),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_delivery_partner_status_history_partner_id" ON "delivery_partner_status_history" ("delivery_partner_id");`,
    );

    await queryRunner.query(`
      INSERT INTO "permissions" ("key", "description", "module") VALUES
        ('delivery_partners:read', 'View delivery partners', 'delivery_partners'),
        ('delivery_partners:approve', 'Approve/reject delivery partner registrations', 'delivery_partners'),
        ('delivery_partners:manage', 'Suspend/block/reinstate delivery partners', 'delivery_partners');
    `);
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r."id", p."id" FROM "roles" r CROSS JOIN "permissions" p
      WHERE r."name" = 'ADMIN' AND p."key" IN ('delivery_partners:read', 'delivery_partners:approve', 'delivery_partners:manage');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "role_permissions" WHERE "permission_id" IN (SELECT "id" FROM "permissions" WHERE "key" IN ('delivery_partners:read', 'delivery_partners:approve', 'delivery_partners:manage'));`,
    );
    await queryRunner.query(
      `DELETE FROM "permissions" WHERE "key" IN ('delivery_partners:read', 'delivery_partners:approve', 'delivery_partners:manage');`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "delivery_partner_status_history";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "delivery_partners";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "vehicle_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "delivery_partner_status_enum";`);
  }
}
