import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * One bank account per restaurant (unique on restaurant_id — a restaurant rebinding to a
 * different account overwrites the row rather than accumulating history, since only the current
 * account is ever actually paid out to). Admin-verified before any real payout gateway will use
 * it — same PENDING/VERIFIED/REJECTED shape as restaurant_documents, reviewed by the same
 * "restaurants:approve" permission. razorpay_contact_id/razorpay_fund_account_id are populated
 * lazily by RazorpayXPayoutGateway the first time a payout actually runs, not at verification
 * time — verifying a bank account is a human trust decision, creating the RazorpayX-side objects
 * is a mechanical API call that can always be retried.
 */
export class AddRestaurantBankAccounts1756010000000 implements MigrationInterface {
  name = "AddRestaurantBankAccounts1756010000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "restaurant_bank_account_status_enum" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');`);

    await queryRunner.query(`
      CREATE TABLE "restaurant_bank_accounts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "restaurant_id" uuid NOT NULL UNIQUE REFERENCES "restaurants"("id") ON DELETE CASCADE,
        "account_holder_name" varchar(255) NOT NULL,
        "account_number" varchar(30) NOT NULL,
        "ifsc_code" varchar(11) NOT NULL,
        "bank_name" varchar(150),
        "status" "restaurant_bank_account_status_enum" NOT NULL DEFAULT 'PENDING',
        "rejection_reason" varchar(500),
        "razorpay_contact_id" varchar(100),
        "razorpay_fund_account_id" varchar(100),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "restaurant_bank_accounts";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "restaurant_bank_account_status_enum";`);
  }
}
