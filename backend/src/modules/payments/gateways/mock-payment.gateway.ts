import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";
import { GatewayOrder, GatewayRefund, PaymentGateway } from "./payment-gateway.interface";

/**
 * Simulates a real gateway's shape without a network call: `createOrder`
 * fabricates a gateway order id, and `verifySignature` checks the same
 * `HMAC-SHA256(orderId|paymentId, secret)` scheme Razorpay's real signature
 * verification uses. A real adapter swap later changes zero call sites.
 */
@Injectable()
export class MockPaymentGateway implements PaymentGateway {
  readonly name = "MOCK";
  readonly clientKey: string;

  constructor(private readonly configService: ConfigService) {
    this.clientKey = configService.get<string>("PAYMENT_GATEWAY_KEY_ID", "mock_key_id_dev");
  }

  async createOrder(amount: number, currency: string, receipt: string): Promise<GatewayOrder> {
    void receipt; // a real gateway would echo this back on its dashboard; unused by the mock
    return { gatewayOrderId: `mock_order_${crypto.randomBytes(8).toString("hex")}`, amount, currency };
  }

  verifySignature(gatewayOrderId: string, gatewayPaymentId: string, signature: string): boolean {
    return this.sign(gatewayOrderId, gatewayPaymentId) === signature;
  }

  async refund(gatewayPaymentId: string, amount: number): Promise<GatewayRefund> {
    void gatewayPaymentId; // a real gateway needs this to know what to reverse; unused by the mock
    void amount;
    return { gatewayRefundId: `mock_refund_${crypto.randomBytes(8).toString("hex")}` };
  }

  /**
   * Mock-only — a real gateway's hosted checkout widget generates this
   * itself in the browser, our backend never would. Exists purely so a
   * dev "simulate successful payment" button has a valid signature to send
   * to the real `/verify` endpoint, exercising the actual verification
   * code path instead of a backdoor that skips it. Delete alongside the
   * mock-complete endpoint when swapping in a real gateway.
   */
  sign(gatewayOrderId: string, gatewayPaymentId: string): string {
    const secret = this.configService.get<string>("PAYMENT_GATEWAY_SECRET", "dev-only-change-me-payment-secret");
    return crypto.createHmac("sha256", secret).update(`${gatewayOrderId}|${gatewayPaymentId}`).digest("hex");
  }
}
