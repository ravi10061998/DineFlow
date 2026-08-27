import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { DataSource, Repository } from "typeorm";
import * as crypto from "crypto";
import { Payment, PaymentStatus } from "./entities/payment.entity";
import { Order, OrderPaymentStatus, OrderStatus } from "../orders/entities/order.entity";
import { OrdersService } from "../orders/orders.service";
import { PAYMENT_GATEWAY, PaymentGateway } from "./gateways/payment-gateway.interface";
import { MockPaymentGateway } from "./gateways/mock-payment.gateway";
import { VerifyPaymentDto } from "./dto/verify-payment.dto";
import { PaymentErrors } from "../../common/exceptions/business.exception";
import { PAYMENT_SUCCEEDED_EVENT, PaymentSucceededEvent } from "../../common/events/payment-succeeded.event";

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private readonly paymentsRepository: Repository<Payment>,
    private readonly ordersService: OrdersService,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    // Only used by mockComplete() below — a real gateway integration deletes that method (and
    // this dependency) entirely, so it's kept separate from the interface-typed `gateway` above.
    private readonly mockGateway: MockPaymentGateway,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findOneOrThrow(id: string, customerId: string): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({ where: { id }, relations: { order: true } });
    if (!payment || payment.order.customerId !== customerId) {
      throw new NotFoundException("Payment not found");
    }
    return payment;
  }

  async getLatestForOrder(orderId: string, customerId: string): Promise<Payment | null> {
    await this.ordersService.findOneOrThrow(orderId, { customerId }); // ownership check, 404s otherwise
    return this.paymentsRepository.findOne({ where: { orderId }, order: { createdAt: "DESC" } });
  }

  /** Unscoped by customer — for internal service-to-service use (Refunds), not a controller-facing lookup. */
  findSucceededPaymentForOrder(orderId: string): Promise<Payment | null> {
    return this.paymentsRepository.findOne({ where: { orderId, status: PaymentStatus.SUCCEEDED }, order: { createdAt: "DESC" } });
  }

  findAllForAdmin(): Promise<Payment[]> {
    return this.paymentsRepository.find({ relations: { order: true }, order: { createdAt: "DESC" } });
  }

  async initiate(orderId: string, customerId: string): Promise<{ payment: Payment; gatewayKeyId: string }> {
    const order = await this.ordersService.findOneOrThrow(orderId, { customerId });
    if (order.paymentStatus === OrderPaymentStatus.PAID) {
      throw PaymentErrors.alreadyPaid();
    }
    if (order.status === OrderStatus.CANCELLED) {
      throw PaymentErrors.orderCancelled();
    }

    const gatewayOrder = await this.gateway.createOrder(Number(order.totalAmount), "INR", order.orderNumber);

    const payment = this.paymentsRepository.create({
      orderId: order.id,
      gateway: this.gateway.name,
      gatewayOrderId: gatewayOrder.gatewayOrderId,
      amount: order.totalAmount,
      currency: gatewayOrder.currency,
      status: PaymentStatus.CREATED,
    });
    const saved = await this.paymentsRepository.save(payment);

    // The client-side checkout widget needs a public key — `clientKey` comes from whichever
    // gateway `this.gateway` actually is, so this can never disagree with which gateway just
    // created the order two lines above.
    return { payment: saved, gatewayKeyId: this.gateway.clientKey };
  }

  async verify(orderId: string, customerId: string, dto: VerifyPaymentDto): Promise<Payment> {
    const order = await this.ordersService.findOneOrThrow(orderId, { customerId }); // ownership check, 404s otherwise
    const payment = await this.paymentsRepository.findOne({ where: { id: dto.paymentId, orderId: order.id } });
    if (!payment) {
      throw new NotFoundException("Payment not found");
    }
    if (payment.status !== PaymentStatus.CREATED) {
      throw PaymentErrors.alreadyProcessed();
    }

    const isValid = this.gateway.verifySignature(payment.gatewayOrderId, dto.gatewayPaymentId, dto.signature);
    await this.applyOutcome(payment, isValid, dto.gatewayPaymentId, isValid ? null : "Signature verification failed");

    if (!isValid) {
      throw PaymentErrors.verificationFailed();
    }

    return this.findOneOrThrow(payment.id, customerId);
  }

  /** Ownership-scoped lookup by (orderId, paymentId) — shared by mockComplete and Webhooks' mock-send. */
  async findOwnedPayment(orderId: string, customerId: string, paymentId: string): Promise<Payment> {
    await this.ordersService.findOneOrThrow(orderId, { customerId }); // ownership check, 404s otherwise
    const payment = await this.paymentsRepository.findOne({ where: { id: paymentId, orderId } });
    if (!payment) {
      throw new NotFoundException("Payment not found");
    }
    return payment;
  }

  /**
   * Applies a gateway-reported outcome by `gatewayOrderId` — this is what a real webhook (Module
   * 13) calls, since a webhook has no `paymentId` to key off, only whatever the gateway itself
   * echoes back. Idempotent: a payment already resolved (by `verify()` or an earlier webhook
   * delivery) is left alone rather than re-applied — the two entry points can race, and whichever
   * lands first wins.
   */
  async applyWebhookOutcome(gatewayOrderId: string, succeeded: boolean, gatewayPaymentId: string, failureReason: string | null): Promise<void> {
    const payment = await this.paymentsRepository.findOne({ where: { gatewayOrderId } });
    if (!payment) {
      throw new NotFoundException(`No payment found for gateway order ${gatewayOrderId}`);
    }
    if (payment.status !== PaymentStatus.CREATED) {
      return; // already resolved — idempotent no-op, not an error
    }
    await this.applyOutcome(payment, succeeded, gatewayPaymentId, failureReason);
  }

  // Payment + Order are updated together — a payment can never end up SUCCEEDED while the
  // order it belongs to is left PENDING (same "cross-table business operation" shape as
  // Order's own status-transition method, just spanning Payment+Order instead of Order+History).
  private async applyOutcome(payment: Payment, succeeded: boolean, gatewayPaymentId: string, failureReason: string | null): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.update(Payment, payment.id, {
        gatewayPaymentId,
        status: succeeded ? PaymentStatus.SUCCEEDED : PaymentStatus.FAILED,
        failureReason: succeeded ? null : failureReason,
      });
      await manager.update(Order, payment.orderId, {
        paymentStatus: succeeded ? OrderPaymentStatus.PAID : OrderPaymentStatus.FAILED,
      });
    });

    // Emitted only after commit — Ledger's listener (crediting the restaurant's payout) must
    // never act on an outcome that could still roll back. Both callers of applyOutcome already
    // guard on payment.status === CREATED before reaching here, so this fires at most once per
    // payment row — no separate idempotency check needed on the Ledger side.
    if (succeeded) {
      this.eventEmitter.emit(PAYMENT_SUCCEEDED_EVENT, new PaymentSucceededEvent(payment.id, payment.orderId));
    }
  }

  /**
   * Stands in for "the customer completed checkout in the gateway's hosted
   * UI and the browser was redirected back with a payment id + signature" —
   * there is no real gateway to redirect to yet. Generates a payment id and
   * a correctly (or, if `succeed` is false, incorrectly) signed payload,
   * then runs it through the exact same `verify()` the real callback would
   * hit. Delete this endpoint's controller route (not `verify` itself) when
   * a real gateway's checkout widget replaces this on the frontend.
   */
  async mockComplete(orderId: string, customerId: string, paymentId: string, succeed: boolean): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({ where: { id: paymentId, orderId } });
    if (!payment) {
      throw new NotFoundException("Payment not found");
    }
    const gatewayPaymentId = `mock_pay_${crypto.randomBytes(6).toString("hex")}`;
    const signature = succeed ? this.mockGateway.sign(payment.gatewayOrderId, gatewayPaymentId) : "deliberately-invalid-signature";
    return this.verify(orderId, customerId, { paymentId, gatewayPaymentId, signature });
  }
}
