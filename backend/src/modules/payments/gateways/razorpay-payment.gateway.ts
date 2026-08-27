import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Razorpay from "razorpay";
import { validatePaymentVerification } from "razorpay/dist/utils/razorpay-utils";
import { GatewayOrder, GatewayRefund, PaymentGateway } from "./payment-gateway.interface";

/**
 * The real gateway, active the moment RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET are both set (see
 * payments.module.ts's factory) — same interface as MockPaymentGateway, so PaymentsService,
 * RefundsService, and everything downstream (Ledger, Webhooks) needed zero changes to use this
 * instead. Amounts here are always paise (Razorpay's own unit) — `order.totalAmount` everywhere
 * else in this app is rupees, so every boundary crossing multiplies/divides by 100 exactly once,
 * here and nowhere else.
 */
@Injectable()
export class RazorpayPaymentGateway implements PaymentGateway {
  readonly name = "RAZORPAY";
  readonly clientKey: string;
  private readonly client: Razorpay;
  private readonly keySecret: string;

  constructor(configService: ConfigService) {
    this.clientKey = configService.getOrThrow<string>("RAZORPAY_KEY_ID");
    this.keySecret = configService.getOrThrow<string>("RAZORPAY_KEY_SECRET");
    this.client = new Razorpay({ key_id: this.clientKey, key_secret: this.keySecret });
  }

  async createOrder(amount: number, currency: string, receipt: string): Promise<GatewayOrder> {
    const order = await this.client.orders.create({
      amount: Math.round(amount * 100),
      currency,
      receipt,
    });
    return { gatewayOrderId: order.id, amount, currency };
  }

  /**
   * Uses Razorpay's own SDK helper rather than hand-rolled HMAC — same
   * `HMAC-SHA256(order_id|payment_id, key_secret)` scheme MockPaymentGateway's
   * `sign()` already simulated, now verified by Razorpay's own code instead
   * of a reimplementation of it.
   */
  verifySignature(gatewayOrderId: string, gatewayPaymentId: string, signature: string): boolean {
    try {
      return validatePaymentVerification({ order_id: gatewayOrderId, payment_id: gatewayPaymentId }, signature, this.keySecret);
    } catch {
      // The SDK helper throws on a malformed signature rather than returning false for some
      // inputs -- either way, anything that doesn't cleanly verify is a failed verification.
      return false;
    }
  }

  async refund(gatewayPaymentId: string, amount: number): Promise<GatewayRefund> {
    const refund = await this.client.payments.refund(gatewayPaymentId, { amount: Math.round(amount * 100) });
    return { gatewayRefundId: refund.id };
  }
}
