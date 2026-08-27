import { ConfigService } from "@nestjs/config";
import { RazorpayPaymentGateway } from "./razorpay-payment.gateway";

const ordersCreate = jest.fn();
const paymentsRefund = jest.fn();

jest.mock("razorpay", () => {
  return jest.fn().mockImplementation(() => ({
    orders: { create: ordersCreate },
    payments: { refund: paymentsRefund },
  }));
});

jest.mock("razorpay/dist/utils/razorpay-utils", () => ({
  validatePaymentVerification: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { validatePaymentVerification } = require("razorpay/dist/utils/razorpay-utils");

describe("RazorpayPaymentGateway", () => {
  let gateway: RazorpayPaymentGateway;

  beforeEach(() => {
    jest.clearAllMocks();
    const configValues: Record<string, string> = { RAZORPAY_KEY_ID: "rzp_test_key", RAZORPAY_KEY_SECRET: "rzp_test_secret" };
    const configService = { getOrThrow: (k: string) => configValues[k] } as unknown as ConfigService;
    gateway = new RazorpayPaymentGateway(configService);
  });

  it("reports its name as RAZORPAY, distinct from the mock", () => {
    expect(gateway.name).toBe("RAZORPAY");
  });

  it("exposes the real key id as clientKey -- PaymentsService.initiate() hands this straight to the frontend", () => {
    expect(gateway.clientKey).toBe("rzp_test_key");
  });

  it("createOrder converts rupees to paise and returns the gateway order id", async () => {
    ordersCreate.mockResolvedValueOnce({ id: "order_abc123" });

    const result = await gateway.createOrder(340.5, "INR", "ORD-1");

    expect(ordersCreate).toHaveBeenCalledWith({ amount: 34050, currency: "INR", receipt: "ORD-1" });
    expect(result).toEqual({ gatewayOrderId: "order_abc123", amount: 340.5, currency: "INR" });
  });

  it("verifySignature delegates to Razorpay's own SDK helper with the right secret", () => {
    validatePaymentVerification.mockReturnValueOnce(true);

    const result = gateway.verifySignature("order_1", "pay_1", "sig_1");

    expect(validatePaymentVerification).toHaveBeenCalledWith({ order_id: "order_1", payment_id: "pay_1" }, "sig_1", "rzp_test_secret");
    expect(result).toBe(true);
  });

  it("verifySignature returns false (not throw) if the SDK helper throws on a malformed signature", () => {
    validatePaymentVerification.mockImplementationOnce(() => {
      throw new Error("malformed");
    });

    expect(gateway.verifySignature("order_1", "pay_1", "not-hex")).toBe(false);
  });

  it("refund converts rupees to paise and returns the gateway refund id", async () => {
    paymentsRefund.mockResolvedValueOnce({ id: "rfnd_xyz789" });

    const result = await gateway.refund("pay_1", 100);

    expect(paymentsRefund).toHaveBeenCalledWith("pay_1", { amount: 10000 });
    expect(result).toEqual({ gatewayRefundId: "rfnd_xyz789" });
  });
});
