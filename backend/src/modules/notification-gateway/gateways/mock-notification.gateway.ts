import { Injectable, Logger } from "@nestjs/common";
import { NotificationGateway, SendEmailParams, SendPushParams, SendSmsParams } from "./notification-gateway.interface";

const EXPO_PUSH_API_URL = "https://exp.host/--/api/v2/push/send";

/**
 * Logs a structured, realistic-looking line instead of making a real network
 * call — the direct replacement for the ad-hoc `console.log("[email-verification] ...")`
 * style stubs scattered across Auth/Subscriptions before this module existed.
 * Always "succeeds" (never throws), same as `MockPaymentGateway`/`MockPayoutGateway`.
 */
@Injectable()
export class MockNotificationGateway implements NotificationGateway {
  readonly name = "MOCK";
  private readonly logger = new Logger(MockNotificationGateway.name);

  async sendEmail(params: SendEmailParams): Promise<void> {
    this.logger.log(`[email] to=${params.to} subject="${params.subject}" body="${params.body}"`);
  }

  async sendSms(params: SendSmsParams): Promise<void> {
    this.logger.log(`[sms] to=${params.to} body="${params.body}"`);
  }

  /**
   * Unlike email/SMS above, this is a REAL call — see the interface's own
   * doc comment for why. `NotificationDispatchService` still wraps every
   * gateway call the same way (record SENT/FAILED regardless of outcome),
   * so a bad/expired token or a network blip is captured the same way a
   * real email provider's bounce would be, not thrown back at the caller.
   */
  async sendPush(params: SendPushParams): Promise<void> {
    const res = await fetch(EXPO_PUSH_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify([{ to: params.to, title: params.title, body: params.body, data: params.data }]),
    });
    if (!res.ok) {
      throw new Error(`Expo push API responded with ${res.status}`);
    }
    const payload = (await res.json()) as { data?: { status: string; message?: string }[] };
    const ticket = payload.data?.[0];
    if (ticket?.status === "error") {
      throw new Error(ticket.message ?? "Expo push API returned an error ticket");
    }
    this.logger.log(`[push] to=${params.to} title="${params.title}"`);
  }
}
