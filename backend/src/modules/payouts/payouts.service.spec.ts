import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { PayoutsService } from "./payouts.service";
import { Payout, PayoutStatus } from "./entities/payout.entity";
import { PAYOUT_GATEWAY } from "./gateways/payout-gateway.interface";
import { SettlementCreatedEvent } from "../../common/events/settlement-created.event";

describe("PayoutsService", () => {
  let service: PayoutsService;
  let payoutsRepo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock; find: jest.Mock };
  let gateway: { name: string; payout: jest.Mock };

  beforeEach(async () => {
    payoutsRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ ...x, id: x.id ?? "po1" })),
      find: jest.fn().mockResolvedValue([]),
    };
    gateway = { name: "MOCK", payout: jest.fn().mockResolvedValue({ gatewayPayoutId: "gp1" }) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PayoutsService,
        { provide: getRepositoryToken(Payout), useValue: payoutsRepo },
        { provide: PAYOUT_GATEWAY, useValue: gateway },
      ],
    }).compile();

    service = moduleRef.get(PayoutsService);
  });

  describe("handleSettlementCreated", () => {
    it("creates and executes a payout on gateway success", async () => {
      await service.handleSettlementCreated(new SettlementCreatedEvent("s1", "r1", "240.00"));

      expect(gateway.payout).toHaveBeenCalledWith("r1", 240);
      expect(payoutsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ settlementId: "s1", restaurantId: "r1", status: PayoutStatus.SUCCEEDED, gatewayPayoutId: "gp1" }),
      );
    });

    it("records a FAILED payout, not thrown away, when the gateway call fails", async () => {
      gateway.payout.mockRejectedValue(new Error("bank rejected the transfer"));

      await service.handleSettlementCreated(new SettlementCreatedEvent("s2", "r1", "100.00"));

      expect(payoutsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: PayoutStatus.FAILED, failureReason: "bank rejected the transfer" }),
      );
    });

    it("is idempotent — never creates a second payout for the same settlement", async () => {
      payoutsRepo.findOne.mockResolvedValue({ id: "po1", settlementId: "s1" });

      await service.handleSettlementCreated(new SettlementCreatedEvent("s1", "r1", "240.00"));

      expect(gateway.payout).not.toHaveBeenCalled();
      expect(payoutsRepo.save).not.toHaveBeenCalled();
    });
  });

  describe("retry", () => {
    it("re-executes a FAILED payout", async () => {
      payoutsRepo.findOne.mockResolvedValue({ id: "po1", restaurantId: "r1", amount: "100.00", status: PayoutStatus.FAILED });

      const result = await service.retry("po1");

      expect(gateway.payout).toHaveBeenCalledWith("r1", 100);
      expect(result.status).toBe(PayoutStatus.SUCCEEDED);
    });

    it("refuses to retry a payout that already succeeded", async () => {
      payoutsRepo.findOne.mockResolvedValue({ id: "po1", status: PayoutStatus.SUCCEEDED });

      await expect(service.retry("po1")).rejects.toMatchObject({ code: "PAYOUT_NOT_FAILED" });
    });

    it("404s on an unknown payout id", async () => {
      payoutsRepo.findOne.mockResolvedValue(null);

      await expect(service.retry("missing")).rejects.toThrow("Payout not found");
    });
  });
});
