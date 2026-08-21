import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { DataSource, Repository } from "typeorm";
import * as crypto from "crypto";
import { Payment, PaymentStatus } from "./entities/payment.entity";
import { Order, OrderPaymentStatus, OrderStatus } from "../orders/entities/order.entity";
import { OrdersService } from "../orders/orders.service";
import { PAYMENT_GATEWAY, PaymentGateway } from "./gateways/payment-gateway.interface";
import { MockPaymentGateway } from "./gateways/mock-payment.gateway";
import { VerifyPaymentDto } from "./dto/verify-payment.dto";
import { PaymentErrors } from "../../common/exceptions/business.exception";

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
    private readonly configService: ConfigService,
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

    // A real client-side checkout widget (Razorpay Checkout, Stripe Elements) needs a public key —
    // the mock gateway's is just a placeholder from config, never a real secret.
    return { payment: saved, gatewayKeyId: this.gatewayKeyId() };
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

    // Payment + Order are updated together — a payment can never end up SUCCEEDED while the
    // order it belongs to is left PENDING (same "cross-table business operation" shape as
    // Order's own status-transition method, just spanning Payment+Order instead of Order+History).
    await this.dataSource.transaction(async (manager) => {
      await manager.update(Payment, payment.id, {
        gatewayPaymentId: dto.gatewayPaymentId,
        status: isValid ? PaymentStatus.SUCCEEDED : PaymentStatus.FAILED,
        failureReason: isValid ? null : "Signature verification failed",
      });
      await manager.update(Order, order.id, {
        paymentStatus: isValid ? OrderPaymentStatus.PAID : OrderPaymentStatus.FAILED,
      });
    });

    if (!isValid) {
      throw PaymentErrors.verificationFailed();
    }

    return this.findOneOrThrow(payment.id, customerId);
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

  private gatewayKeyId(): string {
    return this.configService.get<string>("PAYMENT_GATEWAY_KEY_ID", "mock_key_id_dev");
  }
}
