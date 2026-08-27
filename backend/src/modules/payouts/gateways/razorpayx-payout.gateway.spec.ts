import { ConfigService } from "@nestjs/config";
import { RazorpayXPayoutGateway } from "./razorpayx-payout.gateway";
import { RestaurantBankAccountService } from "../../restaurants/restaurant-bank-account.service";
import { RestaurantBankAccountStatus } from "../../restaurants/entities/restaurant-bank-account.entity";

const apiPost = jest.fn();

jest.mock("razorpay", () => {
  return jest.fn().mockImplementation(() => ({ api: { post: apiPost } }));
});

describe("RazorpayXPayoutGateway", () => {
  let gateway: RazorpayXPayoutGateway;
  let bankAccountService: { findByRestaurantId: jest.Mock; recordRazorpayLinkage: jest.Mock };

  const verifiedAccount = {
    id: "ba1",
    restaurantId: "r1",
    accountHolderName: "Chai Bagwan",
    accountNumber: "123456789012",
    ifscCode: "HDFC0001234",
    status: RestaurantBankAccountStatus.VERIFIED,
    razorpayContactId: null as string | null,
    razorpayFundAccountId: null as string | null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    bankAccountService = {
      findByRestaurantId: jest.fn(),
      recordRazorpayLinkage: jest.fn().mockResolvedValue(undefined),
    };
    const configValues: Record<string, string> = {
      RAZORPAY_KEY_ID: "rzp_test_key",
      RAZORPAY_KEY_SECRET: "rzp_test_secret",
      RAZORPAYX_ACCOUNT_NUMBER: "2323230012345678",
    };
    const configService = { getOrThrow: (k: string) => configValues[k] } as unknown as ConfigService;
    gateway = new RazorpayXPayoutGateway(configService, bankAccountService as unknown as RestaurantBankAccountService);
  });

  it("refuses to pay out a restaurant with no bank account on file at all", async () => {
    bankAccountService.findByRestaurantId.mockResolvedValue(null);
    await expect(gateway.payout("r1", 500)).rejects.toMatchObject({ code: "BANK_ACCOUNT_NOT_VERIFIED" });
    expect(apiPost).not.toHaveBeenCalled();
  });

  it("refuses to pay out a restaurant whose bank account is still PENDING, not VERIFIED", async () => {
    bankAccountService.findByRestaurantId.mockResolvedValue({ ...verifiedAccount, status: RestaurantBankAccountStatus.PENDING });
    await expect(gateway.payout("r1", 500)).rejects.toMatchObject({ code: "BANK_ACCOUNT_NOT_VERIFIED" });
    expect(apiPost).not.toHaveBeenCalled();
  });

  it("creates a Contact + Fund Account on first payout, persists both ids, then creates the payout", async () => {
    bankAccountService.findByRestaurantId.mockResolvedValue({ ...verifiedAccount });
    apiPost
      .mockResolvedValueOnce({ id: "cont_abc" }) // contacts
      .mockResolvedValueOnce({ id: "fa_abc" }) // fund_accounts
      .mockResolvedValueOnce({ id: "pout_abc" }); // payouts

    const result = await gateway.payout("r1", 1250);

    expect(apiPost).toHaveBeenNthCalledWith(1, { url: "/contacts", data: { name: "Chai Bagwan", type: "vendor", reference_id: "r1" } });
    expect(apiPost).toHaveBeenNthCalledWith(2, {
      url: "/fund_accounts",
      data: { contact_id: "cont_abc", account_type: "bank_account", bank_account: { name: "Chai Bagwan", ifsc: "HDFC0001234", account_number: "123456789012" } },
    });
    const payoutCall = apiPost.mock.calls[2][0];
    expect(payoutCall.url).toBe("/payouts");
    expect(payoutCall.data).toMatchObject({
      account_number: "2323230012345678",
      fund_account_id: "fa_abc",
      amount: 125000,
      currency: "INR",
      mode: "IMPS",
      purpose: "payout",
      queue_if_low_balance: true,
    });
    expect(bankAccountService.recordRazorpayLinkage).toHaveBeenCalledWith("ba1", "cont_abc", "fa_abc");
    expect(result).toEqual({ gatewayPayoutId: "pout_abc" });
  });

  it("reuses an already-linked fund account instead of recreating Contact/Fund Account", async () => {
    bankAccountService.findByRestaurantId.mockResolvedValue({
      ...verifiedAccount,
      razorpayContactId: "cont_existing",
      razorpayFundAccountId: "fa_existing",
    });
    apiPost.mockResolvedValueOnce({ id: "pout_xyz" });

    const result = await gateway.payout("r1", 700);

    expect(apiPost).toHaveBeenCalledTimes(1);
    expect(apiPost).toHaveBeenCalledWith(expect.objectContaining({ url: "/payouts", data: expect.objectContaining({ fund_account_id: "fa_existing" }) }));
    expect(bankAccountService.recordRazorpayLinkage).not.toHaveBeenCalled();
    expect(result).toEqual({ gatewayPayoutId: "pout_xyz" });
  });
});
