import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { DataSource } from "typeorm";
import { SettlementsService } from "./settlements.service";
import { Settlement } from "./entities/settlement.entity";
import { LedgerEntry } from "../ledger/entities/ledger-entry.entity";
import { SETTLEMENT_CREATED_EVENT } from "../../common/events/settlement-created.event";

describe("SettlementsService", () => {
  let service: SettlementsService;
  let settlementsRepo: { find: jest.Mock };
  let ledgerRepo: { createQueryBuilder: jest.Mock };
  let queryBuilder: { select: jest.Mock; where: jest.Mock; getRawMany: jest.Mock };
  let dataSource: { transaction: jest.Mock };
  let eventEmitter: { emit: jest.Mock };

  beforeEach(async () => {
    settlementsRepo = { find: jest.fn().mockResolvedValue([]) };
    queryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };
    ledgerRepo = { createQueryBuilder: jest.fn().mockReturnValue(queryBuilder) };
    dataSource = { transaction: jest.fn() };
    eventEmitter = { emit: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        SettlementsService,
        { provide: getRepositoryToken(Settlement), useValue: settlementsRepo },
        { provide: getRepositoryToken(LedgerEntry), useValue: ledgerRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = moduleRef.get(SettlementsService);
  });

  describe("runForRestaurant", () => {
    it("returns null and emits nothing when there's no unsettled balance", async () => {
      dataSource.transaction.mockImplementation(async (cb: any) => cb({ find: async () => [] }));

      const result = await service.runForRestaurant("r1");

      expect(result).toBeNull();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it("sums every unsettled entry, creates one settlement, and stamps every included entry", async () => {
      const unsettled = [
        { id: "e1", restaurantId: "r1", amount: "270.00", createdAt: new Date("2026-01-01") },
        { id: "e2", restaurantId: "r1", amount: "-30.00", createdAt: new Date("2026-01-02") },
      ];
      const updateCalls: any[] = [];
      dataSource.transaction.mockImplementation(async (cb: any) =>
        cb({
          find: async () => unsettled,
          create: (_entity: any, data: any) => data,
          save: async (data: any) => ({ ...data, id: "s1" }),
          update: async (_entity: any, ids: any, patch: any) => updateCalls.push({ ids, patch }),
        }),
      );

      const result = await service.runForRestaurant("r1");

      expect(result).toMatchObject({ id: "s1", restaurantId: "r1", amount: "240.00", periodStart: unsettled[0].createdAt });
      expect(updateCalls[0]).toEqual({ ids: ["e1", "e2"], patch: { settlementId: "s1" } });
      expect(eventEmitter.emit).toHaveBeenCalledWith(SETTLEMENT_CREATED_EVENT, expect.objectContaining({ settlementId: "s1", restaurantId: "r1", amount: "240.00" }));
    });
  });

  describe("runForAllRestaurants", () => {
    it("runs a settlement for every restaurant with an unsettled balance and skips no-op results", async () => {
      queryBuilder.getRawMany.mockResolvedValue([{ restaurantId: "r1" }, { restaurantId: "r2" }]);
      dataSource.transaction
        .mockImplementationOnce(async (cb: any) =>
          cb({
            find: async () => [{ id: "e1", amount: "100.00", createdAt: new Date() }],
            create: (_e: any, data: any) => data,
            save: async (data: any) => ({ ...data, id: "s1" }),
            update: async () => {},
          }),
        )
        .mockImplementationOnce(async (cb: any) => cb({ find: async () => [] })); // r2 has nothing to settle

      const results = await service.runForAllRestaurants();

      expect(results).toHaveLength(1);
      expect(results[0].restaurantId).toBe("r1");
    });
  });
});
