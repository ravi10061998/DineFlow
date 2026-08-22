export const DELIVERY_COMPLETED_EVENT = "delivery.completed";

export class DeliveryCompletedEvent {
  constructor(
    public readonly deliveryAssignmentId: string,
    public readonly deliveryPartnerId: string,
    public readonly orderId: string,
  ) {}
}
