import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Razorpay from "razorpay";
import * as crypto from "crypto";
import { GatewayPayout, PayoutGateway } from "./payout-gateway.interface";
import { RestaurantBankAccountService } from "../../restaurants/restaurant-bank-account.service";
import { RestaurantBankAccountStatus } from "../../restaurants/entities/restaurant-bank-account.entity";
import { PayoutErrors } from "../../../common/exceptions/business.exception";

/**
 * RazorpayX Payouts is a genuinely different product from regular Razorpay Payments (still the
 * same account, same key_id/key_secret, but needs RazorpayX enabled on it) -- Contacts, Fund
 * Accounts, and Payouts aren't part of the `razorpay` npm package's typed surface at all (it only
 * types the Customers-product fund_account, which needs a customer_id, not a contact_id the way
 * RazorpayX's does), so every call here goes through the SDK's own untyped `api.post` escape
 * hatch instead of a typed method -- same authenticated client, same base URL, just no
 * hand-written types for a product surface this SDK version doesn't cover.
 */
@Injectable()
export class RazorpayXPayoutGateway implements PayoutGateway {
  readonly name = "RAZORPAYX";
  private readonly client: Razorpay;
  private readonly payoutAccountNumber: string;

  constructor(
    configService: ConfigService,
    private readonly bankAccountService: RestaurantBankAccountService,
  ) {
    const keyId = configService.getOrThrow<string>("RAZORPAY_KEY_ID");
    const keySecret = configService.getOrThrow<string>("RAZORPAY_KEY_SECRET");
    this.payoutAccountNumber = configService.getOrThrow<string>("RAZORPAYX_ACCOUNT_NUMBER");
    this.client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }

  async payout(restaurantId: string, amount: number): Promise<GatewayPayout> {
    const account = await this.bankAccountService.findByRestaurantId(restaurantId);
    if (!account || account.status !== RestaurantBankAccountStatus.VERIFIED) {
      throw PayoutErrors.bankAccountNotVerified();
    }

    const fundAccountId = await this.ensureFundAccount(account);

    const payout = await this.client.api.post<Record<string, unknown>, { id: string }>({
      url: "/payouts",
      data: {
        account_number: this.payoutAccountNumber,
        fund_account_id: fundAccountId,
        amount: Math.round(amount * 100),
        currency: "INR",
        mode: "IMPS",
        purpose: "payout",
        // If the platform's RazorpayX balance is momentarily too low, queue rather than fail --
        // this payout was already earned by the restaurant (it only fires after a Settlement
        // locks in), so "retry later automatically" is the right default over "reject outright."
        queue_if_low_balance: true,
        reference_id: `dineflow_payout_${restaurantId}_${crypto.randomUUID()}`,
      },
    });

    return { gatewayPayoutId: payout.id };
  }

  /** Contact + Fund Account are created once per restaurant and reused for every subsequent
   * payout -- re-creating them on every call would work (RazorpayX doesn't require uniqueness)
   * but would leave stray duplicate objects on their dashboard for no benefit. */
  private async ensureFundAccount(account: {
    id: string;
    restaurantId: string;
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    razorpayContactId: string | null;
    razorpayFundAccountId: string | null;
  }): Promise<string> {
    if (account.razorpayFundAccountId) {
      return account.razorpayFundAccountId;
    }

    const contactId =
      account.razorpayContactId ??
      (
        await this.client.api.post<Record<string, unknown>, { id: string }>({
          url: "/contacts",
          data: { name: account.accountHolderName, type: "vendor", reference_id: account.restaurantId },
        })
      ).id;

    const fundAccount = await this.client.api.post<Record<string, unknown>, { id: string }>({
      url: "/fund_accounts",
      data: {
        contact_id: contactId,
        account_type: "bank_account",
        bank_account: {
          name: account.accountHolderName,
          ifsc: account.ifscCode,
          account_number: account.accountNumber,
        },
      },
    });

    await this.bankAccountService.recordRazorpayLinkage(account.id, contactId, fundAccount.id);
    return fundAccount.id;
  }
}
