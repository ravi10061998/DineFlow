export const REFUND_SUCCEEDED_EVENT = "refund.succeeded";

export class RefundSucceededEvent {
  constructor(
    public readonly refundId: string,
    public readonly orderId: string,
  ) {}
}
