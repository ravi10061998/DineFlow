import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { OnEvent } from "@nestjs/event-emitter";
import { Repository } from "typeorm";
import { Payout, PayoutStatus } from "./entities/payout.entity";
import { PAYOUT_GATEWAY, PayoutGateway } from "./gateways/payout-gateway.interface";
import { SETTLEMENT_CREATED_EVENT, SettlementCreatedEvent } from "../../common/events/settlement-created.event";
import { PayoutErrors } from "../../common/exceptions/business.exception";

@Injectable()
export class PayoutsService {
  private readonly logger = new Logger(PayoutsService.name);

  constructor(
    @InjectRepository(Payout) private readonly payoutsRepository: Repository<Payout>,
    @Inject(PAYOUT_GATEWAY) private readonly gateway: PayoutGateway,
  ) {}

  /**
   * Auto-create and execute a payout the moment a settlement locks in a
   * balance — Settlements stays completely unaware Payouts exists, same
   * decoupling shape as every other cross-module trigger in this app.
   */
  @OnEvent(SETTLEMENT_CREATED_EVENT)
  async handleSettlementCreated(event: SettlementCreatedEvent): Promise<void> {
    const existing = await this.payoutsRepository.findOne({ where: { settlementId: event.settlementId } });
    if (existing) {
      return; // idempotency guard — a settlement should only ever fire this once, but never double-execute if it somehow did
    }

    const payout = this.payoutsRepository.create({
      settlementId: event.settlementId,
      restaurantId: event.restaurantId,
      gateway: this.gateway.name,
      amount: event.amount,
    });
    await this.executePayout(payout);
  }

  /** The external call happens outside any DB transaction — an API call can't be rolled back, so its outcome is recorded, not assumed. */
  private async executePayout(payout: Payout): Promise<Payout> {
    try {
      const result = await this.gateway.payout(payout.restaurantId, Number(payout.amount));
      payout.status = PayoutStatus.SUCCEEDED;
      payout.gatewayPayoutId = result.gatewayPayoutId;
      payout.failureReason = null;
    } catch (err) {
      payout.status = PayoutStatus.FAILED;
      payout.failureReason = err instanceof Error ? err.message : "Unknown gateway error";
      this.logger.error(`Payout failed for restaurant ${payout.restaurantId}: ${payout.failureReason}`);
    }
    return this.payoutsRepository.save(payout);
  }

  async retry(id: string): Promise<Payout> {
    const payout = await this.payoutsRepository.findOne({ where: { id } });
    if (!payout) {
      throw new NotFoundException("Payout not found");
    }
    if (payout.status !== PayoutStatus.FAILED) {
      throw PayoutErrors.notFailed();
    }
    return this.executePayout(payout);
  }

  findAllForAdmin(): Promise<Payout[]> {
    return this.payoutsRepository.find({ relations: { restaurant: true }, order: { createdAt: "DESC" } });
  }

  findAllForRestaurant(restaurantId: string): Promise<Payout[]> {
    return this.payoutsRepository.find({ where: { restaurantId }, order: { createdAt: "DESC" } });
  }
}
