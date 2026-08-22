/** DI token — interfaces don't exist at runtime, so the gateway is injected by this token. */
export const NOTIFICATION_GATEWAY = "NOTIFICATION_GATEWAY";

export interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
}

export interface SendSmsParams {
  to: string;
  body: string;
}

/**
 * Swappable email/SMS gateway. `MockNotificationGateway` is the only
 * implementation today (no real SendGrid/Twilio account exists in this dev
 * environment) — shaped so a real adapter later swaps in as one new class,
 * same pattern as `PaymentGateway`/`PayoutGateway`.
 */
export interface NotificationGateway {
  readonly name: string;
  sendEmail(params: SendEmailParams): Promise<void>;
  sendSms(params: SendSmsParams): Promise<void>;
}
