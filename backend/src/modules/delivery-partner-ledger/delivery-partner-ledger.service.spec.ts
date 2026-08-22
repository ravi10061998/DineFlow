import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DeliveryPartnerLedgerService } from "./delivery-partner-ledger.service";
import { DeliveryPartnerLedgerEntry, DeliveryPartnerLedgerEntryType } from "./entities/delivery-partner-ledger-entry.entity";
import { DeliveryPartnerPayout, DeliveryPartnerPayoutStatus } from "./entities/delivery-partner-payout.entity";
import { DeliveryPartnerFeeSettings } from "./entities/delivery-partner-fee-settings.entity";
import { PAYOUT_GATEWAY } from "../payouts/gateways/payout-gateway.interface";
import { DeliveryCompletedEvent } from "../../common/events/delivery-completed.event";

describe("DeliveryPartnerLedgerService", () => {
  let service: DeliveryPartnerLedgerService;
  let ledgerRepo: { create: jest.Mock; save: jest.Mock; find: jest.Mock; update: jest.Mock; createQueryBuilder: jest.Mock };
  let payoutsRepo: { create: jest.Mock; save: jest.Mock; find: jest.Mock; findOne: jest.Mock };
  let feeSettingsRepo: { find: jest.Mock; save: jest.Mock };
  let queryBuilder: { select: jest.Mock; where: jest.Mock; getRawOne: jest.Mock; getRawMany: jest.Mock };
  let gateway: { name: string; payout: jest.Mock };

  beforeEach(async () => {
    queryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ balance: "30.00" }),
      getRawMany: jest.fn().mockResolvedValue([]),
    };
    ledgerRepo = {
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    payoutsRepo = {
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ ...x, id: x.id ?? "po1" })),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
    };
    feeSettingsRepo = { find: jest.fn().mockResolvedValue([{ id: "s1", perDeliveryRate: "30.00" }]), save: jest.fn(async (x) => x) };
    gateway = { name: "MOCK", payout: jest.fn().mockResolvedValue({ gatewayPayoutId: "gp1" }) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        DeliveryPartnerLedgerService,
        { provide: getRepositoryToken(DeliveryPartnerLedgerEntry), useValue: ledgerRepo },
        { provide: getRepositoryToken(DeliveryPartnerPayout), useValue: payoutsRepo },
        { provide: getRepositoryToken(DeliveryPartnerFeeSettings), useValue: feeSettingsRepo },
        { provide: PAYOUT_GATEWAY, useValue: gateway },
      ],
    }).compile();

    service = moduleRef.get(DeliveryPartnerLedgerService);
  });

  describe("handleDeliveryCompleted", () => {
    it("credits the configured flat per-delivery rate", async () => {
      await service.handleDeliveryCompleted(new DeliveryCompletedEvent("a1", "p1", "o1"));

      expect(ledgerRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ deliveryPartnerId: "p1", deliveryAssignmentId: "a1", type: DeliveryPartnerLedgerEntryType.DELIVERY_CREDIT, amount: "30.00" }),
      );
    });
  });

  describe("getForPartner", () => {
    it("returns the derived lifetime balance alongside entry history", async () => {
      ledgerRepo.find.mockResolvedValue([{ id: "e1" }]);

      const result = await service.getForPartner("p1");

      expect(result.balance).toBe("30.00");
      expect(result.entries).toHaveLength(1);
    });
  });

  describe("runPayout", () => {
    it("returns null when there's nothing unpaid", async () => {
      ledgerRepo.find.mockResolvedValue([]);

      const result = await service.runPayout("p1");

      expect(result).toBeNull();
      expect(payoutsRepo.save).not.toHaveBeenCalled();
    });

    it("sums unpaid entries, creates a payout, and stamps every included entry", async () => {
      ledgerRepo.find.mockResolvedValue([
        { id: "e1", amount: "30.00", createdAt: new Date("2026-01-01") },
        { id: "e2", amount: "30.00", createdAt: new Date("2026-01-02") },
      ]);

      const result = await service.runPayout("p1");

      expect(result).toMatchObject({ deliveryPartnerId: "p1", amount: "60.00", status: DeliveryPartnerPayoutStatus.SUCCEEDED, gatewayPayoutId: "gp1" });
      expect(ledgerRepo.update).toHaveBeenCalledWith(["e1", "e2"], { payoutId: result!.id });
    });

    it("records a FAILED payout, not thrown away, when the gateway call fails", async () => {
      gateway.payout.mockRejectedValue(new Error("bank rejected the transfer"));
      ledgerRepo.find.mockResolvedValue([{ id: "e1", amount: "30.00", createdAt: new Date() }]);

      const result = await service.runPayout("p1");

      expect(result!.status).toBe(DeliveryPartnerPayoutStatus.FAILED);
      expect(result!.failureReason).toBe("bank rejected the transfer");
    });
  });

  describe("retryPayout", () => {
    it("re-executes a FAILED payout", async () => {
      payoutsRepo.findOne.mockResolvedValue({ id: "po1", deliveryPartnerId: "p1", amount: "30.00", status: DeliveryPartnerPayoutStatus.FAILED });

      const result = await service.retryPayout("po1");

      expect(gateway.payout).toHaveBeenCalledWith("p1", 30);
      expect(result.status).toBe(DeliveryPartnerPayoutStatus.SUCCEEDED);
    });

    it("refuses to retry a payout that already succeeded", async () => {
      payoutsRepo.findOne.mockResolvedValue({ id: "po1", status: DeliveryPartnerPayoutStatus.SUCCEEDED });

      await expect(service.retryPayout("po1")).rejects.toMatchObject({ code: "PAYOUT_NOT_FAILED" });
    });

    it("404s on an unknown payout id", async () => {
      payoutsRepo.findOne.mockResolvedValue(null);

      await expect(service.retryPayout("missing")).rejects.toThrow("Payout not found");
    });
  });

  describe("runPayoutForAllPartners", () => {
    it("runs a payout for every partner with an unpaid balance", async () => {
      queryBuilder.getRawMany.mockResolvedValue([{ deliveryPartnerId: "p1" }, { deliveryPartnerId: "p2" }]);
      ledgerRepo.find
        .mockResolvedValueOnce([{ id: "e1", amount: "30.00", createdAt: new Date() }])
        .mockResolvedValueOnce([]); // p2 has nothing unpaid

      const results = await service.runPayoutForAllPartners();

      expect(results).toHaveLength(1);
      expect(results[0].deliveryPartnerId).toBe("p1");
    });
  });
});
