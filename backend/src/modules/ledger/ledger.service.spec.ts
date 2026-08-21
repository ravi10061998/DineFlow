import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { LedgerService } from "./ledger.service";
import { LedgerEntry, LedgerEntryType } from "./entities/ledger-entry.entity";
import { OrdersService } from "../orders/orders.service";
import { PaymentSucceededEvent } from "../../common/events/payment-succeeded.event";
import { RefundSucceededEvent } from "../../common/events/refund-succeeded.event";

describe("LedgerService", () => {
  let service: LedgerService;
  let ledgerRepo: { create: jest.Mock; save: jest.Mock; find: jest.Mock; createQueryBuilder: jest.Mock };
  let queryBuilder: { select: jest.Mock; where: jest.Mock; getRawOne: jest.Mock };
  let ordersService: { findOneOrThrow: jest.Mock };

  const order = { id: "o1", orderNumber: "ORD-1", restaurantId: "r1", restaurantPayoutAmount: "270.00" };

  beforeEach(async () => {
    queryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ balance: "270.00" }),
    };
    ledgerRepo = {
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    ordersService = { findOneOrThrow: jest.fn().mockResolvedValue(order) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        LedgerService,
        { provide: getRepositoryToken(LedgerEntry), useValue: ledgerRepo },
        { provide: OrdersService, useValue: ordersService },
      ],
    }).compile();

    service = moduleRef.get(LedgerService);
  });

  describe("getForRestaurant", () => {
    it("returns the derived balance alongside the entry history", async () => {
      ledgerRepo.find.mockResolvedValue([{ id: "e1" }]);

      const result = await service.getForRestaurant("r1");

      expect(result.balance).toBe("270.00");
      expect(result.entries).toHaveLength(1);
    });

    it("returns a zero balance when there are no entries yet", async () => {
      queryBuilder.getRawOne.mockResolvedValue({ balance: null });

      const result = await service.getForRestaurant("r1");

      expect(result.balance).toBe("0.00");
    });
  });

  describe("handlePaymentSucceeded", () => {
    it("credits the restaurant's snapshotted payout amount", async () => {
      await service.handlePaymentSucceeded(new PaymentSucceededEvent("p1", "o1"));

      expect(ledgerRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ restaurantId: "r1", orderId: "o1", type: LedgerEntryType.ORDER_CREDIT, amount: "270.00" }),
      );
    });
  });

  describe("handleRefundSucceeded", () => {
    it("debits the exact amount previously credited, not the customer's full refund", async () => {
      await service.handleRefundSucceeded(new RefundSucceededEvent("rf1", "o1"));

      expect(ledgerRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ restaurantId: "r1", orderId: "o1", type: LedgerEntryType.REFUND_DEBIT, amount: "-270.00" }),
      );
    });
  });
});
