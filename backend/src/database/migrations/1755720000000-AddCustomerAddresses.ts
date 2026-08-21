import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Module 9: customer saved addresses — Cart/Orders/Delivery (later modules)
 * will select "deliver to" from this list rather than asking for an address
 * on every order. Reuses the exact address-field convention already
 * established on `restaurants` (address_line1/2, city, state, postal_code,
 * country, latitude, longitude).
 */
export class AddCustomerAddresses1755720000000 implements MigrationInterface {
  name = "AddCustomerAddresses1755720000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "address_label_enum" AS ENUM ('HOME', 'WORK', 'OTHER');`);

    await queryRunner.query(`
      CREATE TABLE "customer_addresses" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "label" "address_label_enum" NOT NULL DEFAULT 'HOME',
        "receiver_name" varchar(255) NOT NULL,
        "receiver_phone" varchar(20) NOT NULL,
        "address_line1" varchar(255) NOT NULL,
        "address_line2" varchar(255),
        "landmark" varchar(255),
        "city" varchar(120) NOT NULL,
        "state" varchar(120) NOT NULL,
        "postal_code" varchar(20) NOT NULL,
        "country" varchar(2) NOT NULL,
        "latitude" decimal(9,6),
        "longitude" decimal(9,6),
        "delivery_instructions" varchar(500),
        "is_default" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_customer_addresses_user_id" ON "customer_addresses" ("user_id");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_addresses";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "address_label_enum";`);
  }
}
