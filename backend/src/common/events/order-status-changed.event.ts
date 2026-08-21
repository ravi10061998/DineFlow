import { OrderStatus } from "../../modules/orders/entities/order.entity";

export const ORDER_STATUS_CHANGED_EVENT = "order.status_changed";

export class OrderStatusChangedEvent {
  constructor(
    public readonly orderId: string,
    public readonly fromStatus: OrderStatus,
    public readonly toStatus: OrderStatus,
    public readonly changedByUserId: string,
  ) {}
}
