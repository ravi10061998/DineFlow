import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { OnEvent } from "@nestjs/event-emitter";
import { Repository } from "typeorm";
import { Notification, NotificationType } from "./entities/notification.entity";
import { OrdersService } from "../orders/orders.service";
import { UsersService } from "../users/users.service";
import { NotificationDispatchService } from "../notification-gateway/notification-dispatch.service";
import { PushTokensService } from "../push-tokens/push-tokens.service";
import { ORDER_STATUS_CHANGED_EVENT, OrderStatusChangedEvent } from "../../common/events/order-status-changed.event";
import { PAYMENT_SUCCEEDED_EVENT, PaymentSucceededEvent } from "../../common/events/payment-succeeded.event";
import { REFUND_SUCCEEDED_EVENT, RefundSucceededEvent } from "../../common/events/refund-succeeded.event";

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private readonly repository: Repository<Notification>,
    private readonly ordersService: OrdersService,
    private readonly usersService: UsersService,
    private readonly notificationDispatchService: NotificationDispatchService,
    private readonly pushTokensService: PushTokensService,
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
   * Reuses Module 11's existing order.status_changed event rather than
   * adding a new call site to OrdersService. As of Module 26, every in-app
   * notification here ALSO fires a mock email through the real notification
   * gateway (Module 26) — the in-app feed and the "email" are the same
   * event, just two channels, not two separate systems to keep in sync.
   */
  @OnEvent(ORDER_STATUS_CHANGED_EVENT)
  async handleOrderStatusChanged(event: OrderStatusChangedEvent): Promise<void> {
    const order = await this.ordersService.findOneOrThrow(event.orderId);
    const title = `Order ${order.orderNumber} ${event.toStatus.toLowerCase().replace(/_/g, " ")}`;
    const body = this.describeTransition(order.orderNumber, event.toStatus);
    await this.createAndDispatch(order.customerId, NotificationType.ORDER_UPDATE, title, body, order.id, "ORDER_UPDATE");
  }

  /** Payment succeeding is a moment worth telling the customer about even though the order itself hasn't changed status yet. */
  @OnEvent(PAYMENT_SUCCEEDED_EVENT)
  async handlePaymentSucceeded(event: PaymentSucceededEvent): Promise<void> {
    const order = await this.ordersService.findOneOrThrow(event.orderId);
    const title = `Payment received for order ${order.orderNumber}`;
    const body = `We've received your payment of ₹${order.totalAmount} for order ${order.orderNumber}.`;
    await this.createAndDispatch(order.customerId, NotificationType.ORDER_UPDATE, title, body, order.id, "PAYMENT_SUCCEEDED");
  }

  @OnEvent(REFUND_SUCCEEDED_EVENT)
  async handleRefundSucceeded(event: RefundSucceededEvent): Promise<void> {
    const order = await this.ordersService.findOneOrThrow(event.orderId);
    const title = `Refund processed for order ${order.orderNumber}`;
    const body = `Your refund for order ${order.orderNumber} has been processed.`;
    await this.createAndDispatch(order.customerId, NotificationType.ORDER_UPDATE, title, body, order.id, "REFUND_SUCCEEDED");
  }

  private async createAndDispatch(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    relatedOrderId: string,
    relatedType: string,
  ): Promise<void> {
    const notification = this.repository.create({ userId, type, title, body, relatedOrderId });
    await this.repository.save(notification);

    // A notification failure must never break the domain action that triggered it — the customer
    // record not existing (shouldn't happen, FK-backed) is the only realistic failure, so this is
    // best-effort by design, same as every gateway call elsewhere in this app.
    const user = await this.usersService.findById(userId).catch(() => null);
    if (!user) return;
    await this.notificationDispatchService.sendEmail({ to: user.email, subject: title, body }, { relatedType, relatedId: relatedOrderId });

    // Same best-effort principle as the email above — a customer with no registered
    // device (never opened the app, or denied notification permission) is the normal
    // case, not an error, so an empty token list is silently a no-op.
    const tokens = await this.pushTokensService.findAllForUser(userId);
    await Promise.all(
      tokens.map((t) =>
        this.notificationDispatchService.sendPush(
          { to: t.token, title, body, data: { relatedType, relatedId: relatedOrderId } },
          { relatedType, relatedId: relatedOrderId },
        ),
      ),
    );
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
