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

export interface SendPushParams {
  /** An Expo push token (e.g. "ExponentPushToken[...]"), not a raw device token. */
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Swappable email/SMS/push gateway. Email and SMS stay mocked in
 * `MockNotificationGateway` (no real SendGrid/Twilio account exists in this
 * dev environment) — shaped so a real adapter later swaps in as one new
 * class, same pattern as `PaymentGateway`/`PayoutGateway`. Push is the odd
 * one out: Expo's push API (https://exp.host/--/api/v2/push/send) is a real,
 * free, unauthenticated HTTP endpoint that genuinely delivers to real
 * devices — there's nothing to mock, so `MockNotificationGateway.sendPush()`
 * makes a real call despite the class's name.
 */
export interface NotificationGateway {
  readonly name: string;
  sendEmail(params: SendEmailParams): Promise<void>;
  sendSms(params: SendSmsParams): Promise<void>;
  sendPush(params: SendPushParams): Promise<void>;
}
