import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { OnEvent } from "@nestjs/event-emitter";
import { IsNull, Repository } from "typeorm";
import { DeliveryPartnerLedgerEntry, DeliveryPartnerLedgerEntryType } from "./entities/delivery-partner-ledger-entry.entity";
import { DeliveryPartnerPayout, DeliveryPartnerPayoutStatus } from "./entities/delivery-partner-payout.entity";
import { DeliveryPartnerFeeSettings } from "./entities/delivery-partner-fee-settings.entity";
import { UpdateDeliveryPartnerFeeSettingsDto } from "./dto/update-delivery-partner-fee-settings.dto";
import { PAYOUT_GATEWAY, PayoutGateway } from "../payouts/gateways/payout-gateway.interface";
import { DELIVERY_COMPLETED_EVENT, DeliveryCompletedEvent } from "../../common/events/delivery-completed.event";
import { PayoutErrors } from "../../common/exceptions/business.exception";

export interface DeliveryPartnerLedgerView {
  balance: string;
  entries: DeliveryPartnerLedgerEntry[];
}

@Injectable()
export class DeliveryPartnerLedgerService {
  private readonly logger = new Logger(DeliveryPartnerLedgerService.name);

  constructor(
    @InjectRepository(DeliveryPartnerLedgerEntry) private readonly ledgerRepository: Repository<DeliveryPartnerLedgerEntry>,
    @InjectRepository(DeliveryPartnerPayout) private readonly payoutsRepository: Repository<DeliveryPartnerPayout>,
    @InjectRepository(DeliveryPartnerFeeSettings) private readonly feeSettingsRepository: Repository<DeliveryPartnerFeeSettings>,
    @Inject(PAYOUT_GATEWAY) private readonly gateway: PayoutGateway,
  ) {}

  /** Credits the flat per-delivery rate the moment a handoff is OTP-confirmed — DeliveryAssignments stays unaware this module exists. */
  @OnEvent(DELIVERY_COMPLETED_EVENT)
  async handleDeliveryCompleted(event: DeliveryCompletedEvent): Promise<void> {
    const settings = await this.getFeeSettings();
    const entry = this.ledgerRepository.create({
      deliveryPartnerId: event.deliveryPartnerId,
      deliveryAssignmentId: event.deliveryAssignmentId,
      type: DeliveryPartnerLedgerEntryType.DELIVERY_CREDIT,
      amount: settings.perDeliveryRate,
      description: `Delivery completed for order`,
    });
    await this.ledgerRepository.save(entry);
  }

  async getFeeSettings(): Promise<DeliveryPartnerFeeSettings> {
    const [settings] = await this.feeSettingsRepository.find({ order: { createdAt: "ASC" }, take: 1 });
    if (!settings) {
      throw new NotFoundException("Delivery partner fee settings have not been seeded — run migrations.");
    }
    return settings;
  }

  async updateFeeSettings(dto: UpdateDeliveryPartnerFeeSettingsDto): Promise<DeliveryPartnerFeeSettings> {
    const settings = await this.getFeeSettings();
    settings.perDeliveryRate = dto.perDeliveryRate.toFixed(2);
    return this.feeSettingsRepository.save(settings);
  }

  async getForPartner(deliveryPartnerId: string): Promise<DeliveryPartnerLedgerView> {
    const [balance, entries] = await Promise.all([
      this.getBalance(deliveryPartnerId),
      this.ledgerRepository.find({ where: { deliveryPartnerId }, order: { createdAt: "DESC" } }),
    ]);
    return { balance, entries };
  }

  private async getBalance(deliveryPartnerId: string): Promise<string> {
    // Lifetime earnings, same semantics as the restaurant ledger (Module 15) — a payout
    // stamps entries as paid but never debits the displayed balance.
    const result = await this.ledgerRepository
      .createQueryBuilder("entry")
      .select("COALESCE(SUM(entry.amount), 0)", "balance")
      .where("entry.delivery_partner_id = :deliveryPartnerId", { deliveryPartnerId })
      .getRawOne<{ balance: string }>();
    return Number(result?.balance ?? 0).toFixed(2);
  }

  /**
   * Sums every not-yet-paid-out entry, stamps them with a new payout row, and executes the
   * transfer — one step where Modules 17+18 used two, since there's no commission-split
   * calculation to lock in independently of the transfer itself. Returns null (a legitimate
   * no-op) if there's nothing unpaid.
   */
  async runPayout(deliveryPartnerId: string): Promise<DeliveryPartnerPayout | null> {
    const unpaid = await this.ledgerRepository.find({
      where: { deliveryPartnerId, payoutId: IsNull() },
      order: { createdAt: "ASC" },
    });
    if (unpaid.length === 0) {
      return null;
    }

    const amount = unpaid.reduce((sum, entry) => sum + Number(entry.amount), 0);
    const payout = this.payoutsRepository.create({
      deliveryPartnerId,
      periodStart: unpaid[0].createdAt,
      periodEnd: new Date(),
      gateway: this.gateway.name,
      amount: amount.toFixed(2),
    });
    const executed = await this.executePayout(payout);

    await this.ledgerRepository.update(
      unpaid.map((entry) => entry.id),
      { payoutId: executed.id },
    );
    return executed;
  }

  async runPayoutForAllPartners(): Promise<DeliveryPartnerPayout[]> {
    const rows = await this.ledgerRepository
      .createQueryBuilder("entry")
      .select("DISTINCT entry.delivery_partner_id", "deliveryPartnerId")
      .where("entry.payout_id IS NULL")
      .getRawMany<{ deliveryPartnerId: string }>();

    const results: DeliveryPartnerPayout[] = [];
    for (const row of rows) {
      const payout = await this.runPayout(row.deliveryPartnerId);
      if (payout) results.push(payout);
    }
    return results;
  }

  private async executePayout(payout: DeliveryPartnerPayout): Promise<DeliveryPartnerPayout> {
    try {
      const result = await this.gateway.payout(payout.deliveryPartnerId, Number(payout.amount));
      payout.status = DeliveryPartnerPayoutStatus.SUCCEEDED;
      payout.gatewayPayoutId = result.gatewayPayoutId;
      payout.failureReason = null;
    } catch (err) {
      payout.status = DeliveryPartnerPayoutStatus.FAILED;
      payout.failureReason = err instanceof Error ? err.message : "Unknown gateway error";
      this.logger.error(`Delivery partner payout failed for ${payout.deliveryPartnerId}: ${payout.failureReason}`);
    }
    return this.payoutsRepository.save(payout);
  }

  /** Re-attempts the gateway call for an already-created FAILED payout — the entries stay stamped to it, nothing is re-summed. */
  async retryPayout(payoutId: string): Promise<DeliveryPartnerPayout> {
    const payout = await this.payoutsRepository.findOne({ where: { id: payoutId } });
    if (!payout) {
      throw new NotFoundException("Payout not found");
    }
    if (payout.status !== DeliveryPartnerPayoutStatus.FAILED) {
      throw PayoutErrors.notFailed();
    }
    return this.executePayout(payout);
  }

  findAllPayoutsForAdmin(): Promise<DeliveryPartnerPayout[]> {
    return this.payoutsRepository.find({ relations: { deliveryPartner: { user: true } }, order: { createdAt: "DESC" } });
  }
}
