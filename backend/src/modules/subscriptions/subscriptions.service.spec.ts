import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { SubscriptionsService } from "./subscriptions.service";
import { SubscriptionPlan, BillingInterval, CommissionType } from "./entities/subscription-plan.entity";
import { TrialSettings } from "./entities/trial-settings.entity";
import { RestaurantSubscription, SubscriptionStatus } from "./entities/restaurant-subscription.entity";
import { SubscriptionEvent } from "./entities/subscription-event.entity";
import { RestaurantStatus } from "../restaurants/entities/restaurant.entity";
import { RestaurantStatusChangedEvent } from "../../common/events/restaurant-status-changed.event";

describe("SubscriptionsService", () => {
  let service: SubscriptionsService;
  let plansRepo: { remove: jest.Mock; findOne: jest.Mock };
  let trialSettingsRepo: { find: jest.Mock };
  let subscriptionsRepo: { findOne: jest.Mock; find: jest.Mock; count: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    plansRepo = { remove: jest.fn(), findOne: jest.fn() };
    trialSettingsRepo = { find: jest.fn() };
    subscriptionsRepo = { findOne: jest.fn(), find: jest.fn(), count: jest.fn() };
    dataSource = { transaction: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: getRepositoryToken(SubscriptionPlan), useValue: plansRepo },
        { provide: getRepositoryToken(TrialSettings), useValue: trialSettingsRepo },
        { provide: getRepositoryToken(RestaurantSubscription), useValue: subscriptionsRepo },
        { provide: getRepositoryToken(SubscriptionEvent), useValue: { find: jest.fn(), exists: jest.fn() } },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = moduleRef.get(SubscriptionsService);
  });

  describe("deletePlan", () => {
    it("refuses to delete a plan with active subscribers", async () => {
      plansRepo.findOne.mockResolvedValue({ id: "plan-1" });
      subscriptionsRepo.count.mockResolvedValue(2);

      await expect(service.deletePlan("plan-1")).rejects.toMatchObject({ code: "PLAN_IN_USE" });
      expect(plansRepo.remove).not.toHaveBeenCalled();
    });

    it("deletes a plan with no subscribers", async () => {
      const plan = { id: "plan-2" };
      plansRepo.findOne.mockResolvedValue(plan);
      subscriptionsRepo.count.mockResolvedValue(0);

      await service.deletePlan("plan-2");

      expect(plansRepo.remove).toHaveBeenCalledWith(plan);
    });
  });

  describe("handleRestaurantStatusChanged (trial start)", () => {
    const event = new RestaurantStatusChangedEvent("r1", RestaurantStatus.PENDING, RestaurantStatus.APPROVED, "admin-1");

    it("does nothing for transitions other than PENDING -> APPROVED", async () => {
      const otherEvent = new RestaurantStatusChangedEvent("r1", RestaurantStatus.APPROVED, RestaurantStatus.SUSPENDED, "admin-1");
      await service.handleRestaurantStatusChanged(otherEvent);
      expect(subscriptionsRepo.findOne).not.toHaveBeenCalled();
    });

    it("skips starting a trial if the restaurant already has a subscription row", async () => {
      subscriptionsRepo.findOne.mockResolvedValue({ id: "existing-sub" });

      await service.handleRestaurantStatusChanged(event);

      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it("skips starting a trial if trials are disabled", async () => {
      subscriptionsRepo.findOne.mockResolvedValue(null);
      trialSettingsRepo.find.mockResolvedValue([{ isEnabled: false, trialDurationDays: 60 }]);

      await service.handleRestaurantStatusChanged(event);

      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it("starts a TRIAL subscription when eligible", async () => {
      subscriptionsRepo.findOne.mockResolvedValue(null);
      trialSettingsRepo.find.mockResolvedValue([{ isEnabled: true, trialDurationDays: 60 }]);

      let savedSubscription: any;
      dataSource.transaction.mockImplementation(async (cb: any) =>
        cb({
          create: (entity: any, data: any) => data,
          save: async (entity: any) => {
            if (entity.status !== undefined) savedSubscription = entity;
            return entity;
          },
        }),
      );

      await service.handleRestaurantStatusChanged(event);

      expect(savedSubscription.status).toBe(SubscriptionStatus.TRIAL);
      expect(savedSubscription.restaurantId).toBe("r1");
    });
  });

  describe("subscribe", () => {
    it("snapshots price and commission from the plan, not from caller input", async () => {
      plansRepo.findOne.mockResolvedValue({
        id: "plan-pro",
        isActive: true,
        price: "1999.00",
        commissionType: CommissionType.PERCENTAGE,
        commissionValue: "5.00",
        billingInterval: BillingInterval.MONTHLY,
      });

      let saved: any;
      dataSource.transaction.mockImplementation(async (cb: any) =>
        cb({
          findOne: async () => null,
          create: (entity: any, data: any) => data,
          save: async (entity: any) => {
            if ("status" in entity) saved = entity;
            return entity;
          },
        }),
      );

      const result = await service.subscribe("r1", "plan-pro");

      expect(result.priceSnapshot).toBe("1999.00");
      expect(result.commissionValueSnapshot).toBe("5.00");
      expect(saved.status).toBe(SubscriptionStatus.ACTIVE);
    });

    it("refuses to subscribe to an inactive plan", async () => {
      plansRepo.findOne.mockResolvedValue({ id: "plan-old", isActive: false });

      await expect(service.subscribe("r1", "plan-old")).rejects.toMatchObject({ code: "PLAN_NOT_ACTIVE" });
    });
  });
});
