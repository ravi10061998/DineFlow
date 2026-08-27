import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Restaurant } from "./restaurant.entity";

export enum RestaurantBankAccountStatus {
  PENDING = "PENDING",
  VERIFIED = "VERIFIED",
  REJECTED = "REJECTED",
}

/**
 * One per restaurant (unique on restaurant_id) — rebinding overwrites rather than accumulates
 * history, since only the current account is ever paid out to. `accountNumber` is real, sensitive
 * data: every read-facing DTO (see restaurant-bank-account.service.ts's `toSafeResponse`) masks it
 * to its last 4 digits — the full value only ever reaches RazorpayXPayoutGateway internally.
 */
@Entity({ name: "restaurant_bank_accounts" })
export class RestaurantBankAccount extends BaseEntity {
  @Column({ name: "restaurant_id", type: "uuid", unique: true })
  @Index()
  restaurantId!: string;

  @ManyToOne(() => Restaurant, { onDelete: "CASCADE" })
  @JoinColumn({ name: "restaurant_id" })
  restaurant!: Restaurant;

  @Column({ name: "account_holder_name", type: "varchar", length: 255 })
  accountHolderName!: string;

  @Column({ name: "account_number", type: "varchar", length: 30 })
  accountNumber!: string;

  @Column({ name: "ifsc_code", type: "varchar", length: 11 })
  ifscCode!: string;

  @Column({ name: "bank_name", type: "varchar", length: 150, nullable: true })
  bankName!: string | null;

  @Column({ type: "enum", enum: RestaurantBankAccountStatus, default: RestaurantBankAccountStatus.PENDING })
  status!: RestaurantBankAccountStatus;

  @Column({ name: "rejection_reason", type: "varchar", length: 500, nullable: true })
  rejectionReason!: string | null;

  /** Set lazily by RazorpayXPayoutGateway the first time a payout actually runs for this restaurant. */
  @Column({ name: "razorpay_contact_id", type: "varchar", length: 100, nullable: true })
  razorpayContactId!: string | null;

  @Column({ name: "razorpay_fund_account_id", type: "varchar", length: 100, nullable: true })
  razorpayFundAccountId!: string | null;
}
