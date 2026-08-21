import { Inject, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { OnEvent } from "@nestjs/event-emitter";
import { DataSource, Repository } from "typeorm";
import { Refund, RefundStatus } from "./entities/refund.entity";
import { Order, OrderPaymentStatus, OrderStatus } from "../orders/entities/order.entity";
import { OrdersService } from "../orders/orders.service";
import { PaymentsService } from "../payments/payments.service";
import { PAYMENT_GATEWAY, PaymentGateway } from "../payments/gateways/payment-gateway.interface";
import { ORDER_STATUS_CHANGED_EVENT, OrderStatusChangedEvent } from "../../common/events/order-status-changed.event";
import { RefundErrors } from "../../common/exceptions/business.exception";

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(
    @InjectRepository(Refund) private readonly refundsRepository: Repository<Refund>,
    private readonly ordersService: OrdersService,
    private readonly paymentsService: PaymentsService,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    private readonly dataSource: DataSource,
  ) {}

  findAllForAdmin(): Promise<Refund[]> {
    return this.refundsRepository.find({ relations: { order: true }, order: { createdAt: "DESC" } });
  }

  /**
   * Auto-refund a cancelled order that had already been paid for — Orders
   * stays completely unaware this module exists, same decoupling as Module
   * 4's restaurant-approval-starts-a-trial listener.
   */
  @OnEvent(ORDER_STATUS_CHANGED_EVENT)
  async handleOrderStatusChanged(event: OrderStatusChangedEvent): Promise<void> {
    if (event.toStatus !== OrderStatus.CANCELLED) {
      return;
    }

    const order = await this.ordersService.findOneOrThrow(event.orderId);
    if (order.paymentStatus !== OrderPaymentStatus.PAID) {
      return; // never paid, or already refunded — nothing to do
    }

    await this.initiateForOrder(event.orderId, event.changedByUserId, "Automatic refund — order cancelled after payment");
  }

  async initiateForOrder(orderId: string, initiatedByUserId: string, reason: string | null): Promise<Refund> {
    const order = await this.ordersService.findOneOrThrow(orderId);
    const payment = await this.paymentsService.findSucceededPaymentForOrder(orderId);
    if (!payment || !payment.gatewayPaymentId) {
      throw RefundErrors.noSucceededPayment();
    }

    // The gateway call happens outside any DB transaction — there's no rolling back an external
    // API call, so its outcome is recorded (success or failure) rather than assumed.
    let gatewayRefundId: string | null = null;
    let status: RefundStatus = RefundStatus.SUCCEEDED;
    let failureReason: string | null = null;
    try {
      const result = await this.gateway.refund(payment.gatewayPaymentId, Number(order.totalAmount));
      gatewayRefundId = result.gatewayRefundId;
    } catch (err) {
      status = RefundStatus.FAILED;
      failureReason = err instanceof Error ? err.message : "Unknown gateway error";
      this.logger.error(`Refund failed for order ${orderId}: ${failureReason}`);
    }

    return this.dataSource.transaction(async (manager) => {
      const refund = manager.create(Refund, {
        orderId,
        paymentId: payment.id,
        gateway: this.gateway.name,
        gatewayRefundId,
        amount: order.totalAmount,
        reason,
        status,
        initiatedByUserId,
        failureReason,
      });
      const saved = await manager.save(refund);

      if (status === RefundStatus.SUCCEEDED) {
        await manager.update(Order, orderId, { paymentStatus: OrderPaymentStatus.REFUNDED });
      }

      return saved;
    });
  }
}
