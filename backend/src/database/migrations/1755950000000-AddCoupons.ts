import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Module 24: real, checkout-integrated discount codes — what Module 16's
 * `offers` table deliberately left as "display-only, not wired into
 * checkout" (see that entity's own doc comment). Kept as a wholly separate
 * table rather than retrofitting `offers`: Offers is a content-management
 * concept (`content:manage`, admin-curated homepage copy) with zero
 * redemption tracking; bolting per-customer usage limits and a
 * row-locked redemption transaction onto it would risk regressing an
 * already-shipped, tested display feature for a financial one. Coupons gets
 * its own dedicated `coupons:read`/`coupons:manage` pair instead of reusing
 * `content:*`, matching Ledger/Delivery-Fee's precedent that a
 * checkout-critical money feature is "central enough" to warrant its own
 * permission.
 */
export class AddCoupons1755950000000 implements MigrationInterface {
  name = "AddCoupons1755950000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "coupons" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" varchar(30) NOT NULL UNIQUE,
        "description" varchar(500),
        "discount_type" "commission_type_enum" NOT NULL,
        "discount_value" decimal(10,2) NOT NULL,
        "min_order_amount" decimal(10,2),
        "max_discount_amount" decimal(10,2),
        "restaurant_id" uuid REFERENCES "restaurants"("id") ON DELETE CASCADE,
        "per_customer_limit" int NOT NULL DEFAULT 1,
        "total_redemption_limit" int,
        "starts_at" timestamptz,
        "expires_at" timestamptz,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_coupons_restaurant_id" ON "coupons" ("restaurant_id");`);

    await queryRunner.query(`
      CREATE TABLE "coupon_redemptions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "coupon_id" uuid NOT NULL REFERENCES "coupons"("id") ON DELETE RESTRICT,
        "customer_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "order_id" uuid NOT NULL UNIQUE REFERENCES "orders"("id") ON DELETE RESTRICT,
        "discount_amount" decimal(10,2) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_coupon_redemptions_coupon_id" ON "coupon_redemptions" ("coupon_id");`);
    await queryRunner.query(`CREATE INDEX "idx_coupon_redemptions_customer_id" ON "coupon_redemptions" ("customer_id");`);

    // Snapshotted onto the order itself — same "never re-derive a money figure later" rule as
    // commissionAmount/deliveryFee. couponCode is denormalized (not just coupon_id) so an order's
    // receipt still shows what code was used even if the coupon is later deleted... except a
    // coupon can never actually be deleted while redemptions reference it (ON DELETE RESTRICT
    // above), so this is belt-and-suspenders, matching how deliveryDistanceKm etc. are handled.
    await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN "discount_amount" decimal(10,2) NOT NULL DEFAULT 0;`);
    await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN "coupon_code" varchar(30);`);

    await queryRunner.query(`
      INSERT INTO "permissions" ("key", "description", "module") VALUES
        ('coupons:read', 'View coupons and their redemption history', 'coupons'),
        ('coupons:manage', 'Create, edit, and deactivate coupons', 'coupons');
    `);
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r."id", p."id" FROM "roles" r CROSS JOIN "permissions" p
      WHERE r."name" = 'ADMIN' AND p."key" IN ('coupons:read', 'coupons:manage');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "role_permissions" WHERE "permission_id" IN (SELECT "id" FROM "permissions" WHERE "key" IN ('coupons:read', 'coupons:manage'));`);
    await queryRunner.query(`DELETE FROM "permissions" WHERE "key" IN ('coupons:read', 'coupons:manage');`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "coupon_code";`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "discount_amount";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "coupon_redemptions";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "coupons";`);
  }
}
