import { Injectable, Logger } from "@nestjs/common";
import { NotificationGateway, SendEmailParams, SendSmsParams } from "./notification-gateway.interface";

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
}
