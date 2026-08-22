export const SETTLEMENT_CREATED_EVENT = "settlement.created";

export class SettlementCreatedEvent {
  constructor(
    public readonly settlementId: string,
    public readonly restaurantId: string,
    public readonly amount: string,
  ) {}
}
