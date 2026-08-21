export const PAYMENT_SUCCEEDED_EVENT = "payment.succeeded";

export class PaymentSucceededEvent {
  constructor(
    public readonly paymentId: string,
    public readonly orderId: string,
  ) {}
}
