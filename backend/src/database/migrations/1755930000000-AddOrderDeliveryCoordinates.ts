import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Module 22: Delivery Tracking. The delivery address's text fields were
 * already snapshotted onto Order at checkout (Module 11); its coordinates
 * were not, even though CustomerAddress has had them since Module 9 — this
 * closes that gap so tracking can compute "how far is my delivery partner
 * from me right now" without joining back to a customer_addresses row that
 * may since have been edited or deleted.
 */
export class AddOrderDeliveryCoordinates1755930000000 implements MigrationInterface {
  name = "AddOrderDeliveryCoordinates1755930000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders"
        ADD COLUMN "delivery_latitude" decimal(9,6),
        ADD COLUMN "delivery_longitude" decimal(9,6);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "delivery_latitude", DROP COLUMN "delivery_longitude";`);
  }
}
