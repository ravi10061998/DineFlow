import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { CommissionService } from "./commission.service";
import { CommissionRule } from "./entities/commission-rule.entity";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import { SubscriptionStatus } from "../subscriptions/entities/restaurant-subscription.entity";
import { CommissionType } from "../../common/enums/commission-type.enum";

describe("CommissionService", () => {
  let service: CommissionService;
  let rulesRepo: { find: jest.Mock; findOne: jest.Mock };
  let subscriptionsService: { findForRestaurantOrNull: jest.Mock; getTrialSettings: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    rulesRepo = { find: jest.fn().mockResolvedValue([]), findOne: jest.fn() };
    subscriptionsService = { findForRestaurantOrNull: jest.fn(), getTrialSettings: jest.fn() };
    dataSource = { transaction: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CommissionService,
        { provide: getRepositoryToken(CommissionRule), useValue: rulesRepo },
        { provide: SubscriptionsService, useValue: subscriptionsService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = moduleRef.get(CommissionService);
  });

  describe("getEffectiveCommission precedence", () => {
    it("prefers a restaurant-specific override over the plan", async () => {
      rulesRepo.find.mockResolvedValue([{ commissionType: CommissionType.FIXED, commissionValue: "50.00" }]);
      subscriptionsService.findForRestaurantOrNull.mockResolvedValue({
        status: SubscriptionStatus.ACTIVE,
        commissionTypeSnapshot: CommissionType.PERCENTAGE,
        commissionValueSnapshot: "5.00",
      });

      const result = await service.getEffectiveCommission("r1");

      expect(result).toEqual({ source: "RESTAURANT_OVERRIDE", commissionType: CommissionType.FIXED, commissionValue: 50 });
    });

    it("falls back to the plan snapshot when ACTIVE and no override exists", async () => {
      subscriptionsService.findForRestaurantOrNull.mockResolvedValue({
        status: SubscriptionStatus.ACTIVE,
        commissionTypeSnapshot: CommissionType.PERCENTAGE,
        commissionValueSnapshot: "5.00",
      });

      const result = await service.getEffectiveCommission("r1");

      expect(result).toEqual({ source: "PLAN", commissionType: CommissionType.PERCENTAGE, commissionValue: 5 });
    });

    it("falls back to trial settings when the restaurant is on TRIAL", async () => {
      subscriptionsService.findForRestaurantOrNull.mockResolvedValue({ status: SubscriptionStatus.TRIAL });
      subscriptionsService.getTrialSettings.mockResolvedValue({
        trialCommissionType: CommissionType.PERCENTAGE,
        trialCommissionValue: "0.00",
      });

      const result = await service.getEffectiveCommission("r1");

      expect(result).toEqual({ source: "TRIAL", commissionType: CommissionType.PERCENTAGE, commissionValue: 0 });
    });

    it("throws NO_COMMISSION_SOURCE when there is no override, active plan, or trial", async () => {
      subscriptionsService.findForRestaurantOrNull.mockResolvedValue({ status: SubscriptionStatus.CANCELLED });

      await expect(service.getEffectiveCommission("r1")).rejects.toMatchObject({ code: "NO_COMMISSION_SOURCE" });
    });
  });

  describe("calculateCommission", () => {
    it("computes a percentage split", async () => {
      subscriptionsService.findForRestaurantOrNull.mockResolvedValue({
        status: SubscriptionStatus.ACTIVE,
        commissionTypeSnapshot: CommissionType.PERCENTAGE,
        commissionValueSnapshot: "10.00",
      });

      const result = await service.calculateCommission("r1", 1000);

      expect(result.platformAmount).toBe(100);
      expect(result.restaurantAmount).toBe(900);
    });

    it("clamps a fixed commission so it never exceeds the order amount", async () => {
      subscriptionsService.findForRestaurantOrNull.mockResolvedValue({
        status: SubscriptionStatus.ACTIVE,
        commissionTypeSnapshot: CommissionType.FIXED,
        commissionValueSnapshot: "500.00",
      });

      const result = await service.calculateCommission("r1", 100);

      expect(result.platformAmount).toBe(100);
      expect(result.restaurantAmount).toBe(0);
    });
  });

  describe("createRule", () => {
    it("deactivates the prior active rule for the same restaurant", async () => {
      const updateCalls: any[] = [];
      dataSource.transaction.mockImplementation(async (cb: any) =>
        cb({
          update: async (...args: any[]) => updateCalls.push(args),
          create: (_entity: any, data: any) => data,
          save: async (entity: any) => entity,
        }),
      );

      await service.createRule(
        { restaurantId: "r1", commissionType: CommissionType.PERCENTAGE, commissionValue: 3, reason: "negotiated rate" },
        "admin-1",
      );

      expect(updateCalls[0]).toEqual([CommissionRule, { restaurantId: "r1", isActive: true }, { isActive: false }]);
    });
  });
});
