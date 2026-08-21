import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { OnEvent } from "@nestjs/event-emitter";
import { Repository } from "typeorm";
import { Notification, NotificationType } from "./entities/notification.entity";
import { OrdersService } from "../orders/orders.service";
import { ORDER_STATUS_CHANGED_EVENT, OrderStatusChangedEvent } from "../../common/events/order-status-changed.event";

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private readonly repository: Repository<Notification>,
    private readonly ordersService: OrdersService,
  ) {}

  findAllForUser(userId: string): Promise<Notification[]> {
    return this.repository.find({ where: { userId }, order: { createdAt: "DESC" } });
  }

  async markRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.repository.findOne({ where: { id, userId } });
    if (!notification) {
      throw new NotFoundException("Notification not found");
    }
    notification.isRead = true;
    return this.repository.save(notification);
  }

  /**
   * The one real, wired-up notification trigger for this slice — reuses
   * Module 11's existing order.status_changed event rather than adding a
   * new call site to OrdersService. A platform-wide dispatch system
   * covering every module's own events is a reasonable future module, not
   * built here.
   */
  @OnEvent(ORDER_STATUS_CHANGED_EVENT)
  async handleOrderStatusChanged(event: OrderStatusChangedEvent): Promise<void> {
    const order = await this.ordersService.findOneOrThrow(event.orderId);
    const notification = this.repository.create({
      userId: order.customerId,
      type: NotificationType.ORDER_UPDATE,
      title: `Order ${order.orderNumber} ${event.toStatus.toLowerCase().replace(/_/g, " ")}`,
      body: this.describeTransition(order.orderNumber, event.toStatus),
      relatedOrderId: order.id,
    });
    await this.repository.save(notification);
  }

  private describeTransition(orderNumber: string, toStatus: string): string {
    const messages: Record<string, string> = {
      CONFIRMED: `Your order ${orderNumber} has been confirmed by the restaurant.`,
      PREPARING: `The restaurant has started preparing your order ${orderNumber}.`,
      READY: `Your order ${orderNumber} is ready.`,
      OUT_FOR_DELIVERY: `Your order ${orderNumber} is out for delivery.`,
      DELIVERED: `Your order ${orderNumber} has been delivered. Enjoy!`,
      CANCELLED: `Your order ${orderNumber} was cancelled.`,
    };
    return messages[toStatus] ?? `Your order ${orderNumber} status changed to ${toStatus}.`;
  }
}
