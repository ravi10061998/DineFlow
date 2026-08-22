import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Cron, CronExpression } from "@nestjs/schedule";
import { DataSource, IsNull, Repository } from "typeorm";
import { Settlement } from "./entities/settlement.entity";
import { LedgerEntry } from "../ledger/entities/ledger-entry.entity";
import { SETTLEMENT_CREATED_EVENT, SettlementCreatedEvent } from "../../common/events/settlement-created.event";

@Injectable()
export class SettlementsService {
  private readonly logger = new Logger(SettlementsService.name);

  constructor(
    @InjectRepository(Settlement) private readonly settlementsRepository: Repository<Settlement>,
    @InjectRepository(LedgerEntry) private readonly ledgerRepository: Repository<LedgerEntry>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Locks in every currently-unsettled ledger entry for a restaurant into one
   * new settlement, in a single transaction so a ledger entry created mid-run
   * can never be read into the sum but miss being stamped (or vice versa).
   * Returns null (a legitimate no-op, not an error) if there's nothing to settle.
   */
  async runForRestaurant(restaurantId: string): Promise<Settlement | null> {
    const settlement = await this.dataSource.transaction(async (manager) => {
      const unsettled = await manager.find(LedgerEntry, {
        where: { restaurantId, settlementId: IsNull() },
        order: { createdAt: "ASC" },
      });
      if (unsettled.length === 0) {
        return null;
      }

      const amount = unsettled.reduce((sum, entry) => sum + Number(entry.amount), 0);
      const created = manager.create(Settlement, {
        restaurantId,
        periodStart: unsettled[0].createdAt,
        periodEnd: new Date(),
        amount: amount.toFixed(2),
      });
      const saved = await manager.save(created);

      await manager.update(
        LedgerEntry,
        unsettled.map((entry) => entry.id),
        { settlementId: saved.id },
      );

      return saved;
    });

    if (settlement) {
      this.eventEmitter.emit(SETTLEMENT_CREATED_EVENT, new SettlementCreatedEvent(settlement.id, settlement.restaurantId, settlement.amount));
    }
    return settlement;
  }

  /** Every restaurant with at least one unsettled ledger entry, in one pass — what both the cron and the admin "run all" button call. */
  async runForAllRestaurants(): Promise<Settlement[]> {
    const rows = await this.ledgerRepository
      .createQueryBuilder("entry")
      .select("DISTINCT entry.restaurant_id", "restaurantId")
      .where("entry.settlement_id IS NULL")
      .getRawMany<{ restaurantId: string }>();

    const results: Settlement[] = [];
    for (const row of rows) {
      const settlement = await this.runForRestaurant(row.restaurantId);
      if (settlement) {
        results.push(settlement);
      }
    }
    return results;
  }

  /**
   * Real settlement cadence — weekly, matching how a real payout cycle runs.
   * The admin "run all" endpoint exists for demo/testing without waiting a week.
   */
  @Cron(CronExpression.EVERY_WEEK)
  async runWeeklySettlements(): Promise<void> {
    const settlements = await this.runForAllRestaurants();
    this.logger.log(`Weekly settlement run created ${settlements.length} settlement(s).`);
  }

  findAllForAdmin(): Promise<Settlement[]> {
    return this.settlementsRepository.find({ relations: { restaurant: true }, order: { createdAt: "DESC" } });
  }

  findAllForRestaurant(restaurantId: string): Promise<Settlement[]> {
    return this.settlementsRepository.find({ where: { restaurantId }, order: { createdAt: "DESC" } });
  }
}
