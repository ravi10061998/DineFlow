import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { OnEvent } from "@nestjs/event-emitter";
import { Repository } from "typeorm";
import { LedgerEntry, LedgerEntryType } from "./entities/ledger-entry.entity";
import { OrdersService } from "../orders/orders.service";
import { PAYMENT_SUCCEEDED_EVENT, PaymentSucceededEvent } from "../../common/events/payment-succeeded.event";
import { REFUND_SUCCEEDED_EVENT, RefundSucceededEvent } from "../../common/events/refund-succeeded.event";

export interface LedgerView {
  balance: string;
  entries: LedgerEntry[];
}

@Injectable()
export class LedgerService {
  constructor(
    @InjectRepository(LedgerEntry) private readonly ledgerRepository: Repository<LedgerEntry>,
    private readonly ordersService: OrdersService,
  ) {}

  async getForRestaurant(restaurantId: string): Promise<LedgerView> {
    const [balance, entries] = await Promise.all([this.getBalance(restaurantId), this.findAllForRestaurant(restaurantId)]);
    return { balance, entries };
  }

  private findAllForRestaurant(restaurantId: string): Promise<LedgerEntry[]> {
    return this.ledgerRepository.find({ where: { restaurantId }, order: { createdAt: "DESC" } });
  }

  private async getBalance(restaurantId: string): Promise<string> {
    // Always derived, never stored — a balance column could drift out of sync with its own entries.
    const result = await this.ledgerRepository
      .createQueryBuilder("entry")
      .select("COALESCE(SUM(entry.amount), 0)", "balance")
      .where("entry.restaurant_id = :restaurantId", { restaurantId })
      .getRawOne<{ balance: string }>();
    return Number(result?.balance ?? 0).toFixed(2);
  }

  /** Credits the restaurant's already-computed payout share (Module 5's commission split) the moment a payment succeeds. */
  @OnEvent(PAYMENT_SUCCEEDED_EVENT)
  async handlePaymentSucceeded(event: PaymentSucceededEvent): Promise<void> {
    const order = await this.ordersService.findOneOrThrow(event.orderId);
    const entry = this.ledgerRepository.create({
      restaurantId: order.restaurantId,
      orderId: order.id,
      type: LedgerEntryType.ORDER_CREDIT,
      amount: order.restaurantPayoutAmount,
      description: `Order ${order.orderNumber} payout`,
    });
    await this.ledgerRepository.save(entry);
  }

  /** Reverses the exact amount originally credited for this order — not the customer's full refund, which includes the platform's commission. */
  @OnEvent(REFUND_SUCCEEDED_EVENT)
  async handleRefundSucceeded(event: RefundSucceededEvent): Promise<void> {
    const order = await this.ordersService.findOneOrThrow(event.orderId);
    const entry = this.ledgerRepository.create({
      restaurantId: order.restaurantId,
      orderId: order.id,
      type: LedgerEntryType.REFUND_DEBIT,
      amount: `-${order.restaurantPayoutAmount}`,
      description: `Refund for order ${order.orderNumber}`,
    });
    await this.ledgerRepository.save(entry);
  }
}
