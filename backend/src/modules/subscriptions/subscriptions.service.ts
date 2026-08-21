import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { OnEvent } from "@nestjs/event-emitter";
import { Cron, CronExpression } from "@nestjs/schedule";
import { LessThanOrEqual, Repository } from "typeorm";
import { DataSource } from "typeorm";
import { SubscriptionPlan } from "./entities/subscription-plan.entity";
import { TrialSettings } from "./entities/trial-settings.entity";
import { RestaurantSubscription, SubscriptionStatus } from "./entities/restaurant-subscription.entity";
import { SubscriptionEvent, SubscriptionEventType } from "./entities/subscription-event.entity";
import { CreatePlanDto } from "./dto/create-plan.dto";
import { UpdatePlanDto } from "./dto/update-plan.dto";
import { UpdateTrialSettingsDto } from "./dto/update-trial-settings.dto";
import { RestaurantStatus } from "../restaurants/entities/restaurant.entity";
import {
  RESTAURANT_STATUS_CHANGED_EVENT,
  RestaurantStatusChangedEvent,
} from "../../common/events/restaurant-status-changed.event";
import { SubscriptionErrors } from "../../common/exceptions/business.exception";

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(SubscriptionPlan) private readonly plansRepository: Repository<SubscriptionPlan>,
    @InjectRepository(TrialSettings) private readonly trialSettingsRepository: Repository<TrialSettings>,
    @InjectRepository(RestaurantSubscription)
    private readonly subscriptionsRepository: Repository<RestaurantSubscription>,
    @InjectRepository(SubscriptionEvent) private readonly eventsRepository: Repository<SubscriptionEvent>,
    private readonly dataSource: DataSource,
  ) {}

  // --- Plans -------------------------------------------------------------

  findAllPlans(includeInactive = false): Promise<SubscriptionPlan[]> {
    return this.plansRepository.find({
      where: includeInactive ? {} : { isActive: true },
      order: { sortOrder: "ASC" },
    });
  }

  async findPlanOrThrow(id: string): Promise<SubscriptionPlan> {
    const plan = await this.plansRepository.findOne({ where: { id } });
    if (!plan) throw new NotFoundException("Subscription plan not found");
    return plan;
  }

  createPlan(dto: CreatePlanDto): Promise<SubscriptionPlan> {
    const plan = this.plansRepository.create({
      ...dto,
      price: String(dto.price),
      commissionValue: String(dto.commissionValue),
      features: dto.features ?? [],
      limits: dto.limits ?? {},
    });
    return this.plansRepository.save(plan);
  }

  async updatePlan(id: string, dto: UpdatePlanDto): Promise<SubscriptionPlan> {
    const plan = await this.findPlanOrThrow(id);
    Object.assign(plan, {
      ...dto,
      price: dto.price !== undefined ? String(dto.price) : plan.price,
      commissionValue: dto.commissionValue !== undefined ? String(dto.commissionValue) : plan.commissionValue,
    });
    return this.plansRepository.save(plan);
  }

  async deletePlan(id: string): Promise<void> {
    const plan = await this.findPlanOrThrow(id);
    const subscriberCount = await this.subscriptionsRepository.count({ where: { planId: id } });
    if (subscriberCount > 0) {
      throw SubscriptionErrors.planInUse();
    }
    await this.plansRepository.remove(plan);
  }

  countActivePlans(): Promise<number> {
    return this.plansRepository.count({ where: { isActive: true } });
  }

  /** Used by the admin dashboard summary — one grouped count query rather than fetching every row. */
  async countSubscriptionsByStatus(): Promise<Record<SubscriptionStatus, number>> {
    const rows = await this.subscriptionsRepository
      .createQueryBuilder("subscription")
      .select("subscription.status", "status")
      .addSelect("COUNT(*)", "count")
      .groupBy("subscription.status")
      .getRawMany<{ status: SubscriptionStatus; count: string }>();

    const counts = Object.fromEntries(Object.values(SubscriptionStatus).map((status) => [status, 0])) as Record<
      SubscriptionStatus,
      number
    >;
    for (const row of rows) {
      counts[row.status] = Number(row.count);
    }
    return counts;
  }

  // --- Trial settings ------------------------------------------------------

  async getTrialSettings(): Promise<TrialSettings> {
    const [settings] = await this.trialSettingsRepository.find({ order: { createdAt: "ASC" }, take: 1 });
    if (!settings) {
      throw new NotFoundException("Trial settings have not been seeded — run migrations.");
    }
    return settings;
  }

  async updateTrialSettings(dto: UpdateTrialSettingsDto): Promise<TrialSettings> {
    const settings = await this.getTrialSettings();
    Object.assign(settings, {
      ...dto,
      trialCommissionValue:
        dto.trialCommissionValue !== undefined ? String(dto.trialCommissionValue) : settings.trialCommissionValue,
    });
    return this.trialSettingsRepository.save(settings);
  }

  // --- Restaurant subscription state --------------------------------------

  async findForRestaurant(restaurantId: string): Promise<RestaurantSubscription> {
    const subscription = await this.subscriptionsRepository.findOne({
      where: { restaurantId },
      relations: { plan: true },
    });
    if (!subscription) throw SubscriptionErrors.noSubscription();
    return subscription;
  }

  async findForRestaurantOrNull(restaurantId: string): Promise<RestaurantSubscription | null> {
    return this.subscriptionsRepository.findOne({ where: { restaurantId }, relations: { plan: true } });
  }

  getEventsForRestaurant(restaurantId: string): Promise<SubscriptionEvent[]> {
    return this.eventsRepository.find({ where: { restaurantId }, order: { createdAt: "DESC" } });
  }

  /**
   * Trial start, triggered by Restaurant approval (§5: "Restaurant gets only
   * one free trial") — the "no existing row" check is what makes that
   * structural rather than a convention a future change could violate.
   */
  @OnEvent(RESTAURANT_STATUS_CHANGED_EVENT)
  async handleRestaurantStatusChanged(event: RestaurantStatusChangedEvent): Promise<void> {
    if (event.fromStatus !== RestaurantStatus.PENDING || event.toStatus !== RestaurantStatus.APPROVED) {
      return;
    }

    const existing = await this.subscriptionsRepository.findOne({ where: { restaurantId: event.restaurantId } });
    if (existing) {
      return; // Already had a subscription record — never grant a second trial.
    }

    const trialSettings = await this.getTrialSettings();
    if (!trialSettings.isEnabled) {
      this.logger.log(`Trials disabled — restaurant ${event.restaurantId} approved without a trial.`);
      return;
    }

    await this.dataSource.transaction(async (manager) => {
      const now = new Date();
      const trialEndsAt = new Date(now.getTime() + trialSettings.trialDurationDays * 24 * 60 * 60 * 1000);
      const subscription = manager.create(RestaurantSubscription, {
        restaurantId: event.restaurantId,
        status: SubscriptionStatus.TRIAL,
        trialStartedAt: now,
        trialEndsAt,
      });
      await manager.save(subscription);
      await manager.save(
        manager.create(SubscriptionEvent, {
          restaurantId: event.restaurantId,
          subscriptionId: subscription.id,
          type: SubscriptionEventType.TRIAL_STARTED,
          metadata: { trialDurationDays: trialSettings.trialDurationDays },
        }),
      );
    });
  }

  async subscribe(restaurantId: string, planId: string): Promise<RestaurantSubscription> {
    const plan = await this.findPlanOrThrow(planId);
    if (!plan.isActive) {
      throw SubscriptionErrors.planNotActive();
    }

    return this.dataSource.transaction(async (manager) => {
      let subscription = await manager.findOne(RestaurantSubscription, { where: { restaurantId } });
      const previousPlanId = subscription?.planId ?? null;
      const periodDays = plan.billingInterval === "YEARLY" ? 365 : 30;
      const now = new Date();

      if (!subscription) {
        subscription = manager.create(RestaurantSubscription, { restaurantId });
      }
      subscription.status = SubscriptionStatus.ACTIVE;
      subscription.planId = plan.id;
      subscription.priceSnapshot = plan.price;
      subscription.commissionTypeSnapshot = plan.commissionType;
      subscription.commissionValueSnapshot = plan.commissionValue;
      subscription.currentPeriodStart = now;
      subscription.currentPeriodEnd = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000);
      subscription.cancelledAt = null;
      await manager.save(subscription);

      await manager.save(
        manager.create(SubscriptionEvent, {
          restaurantId,
          subscriptionId: subscription.id,
          type: previousPlanId && previousPlanId !== plan.id ? SubscriptionEventType.PLAN_CHANGED : SubscriptionEventType.SUBSCRIBED,
          metadata: { planId: plan.id, previousPlanId },
        }),
      );

      return subscription;
    });
  }

  async cancel(restaurantId: string): Promise<RestaurantSubscription> {
    return this.dataSource.transaction(async (manager) => {
      const subscription = await manager.findOne(RestaurantSubscription, { where: { restaurantId } });
      if (!subscription) throw SubscriptionErrors.noSubscription();

      subscription.status = SubscriptionStatus.CANCELLED;
      subscription.cancelledAt = new Date();
      await manager.save(subscription);

      await manager.save(
        manager.create(SubscriptionEvent, {
          restaurantId,
          subscriptionId: subscription.id,
          type: SubscriptionEventType.CANCELLED,
          metadata: null,
        }),
      );

      return subscription;
    });
  }

  // --- Background job ------------------------------------------------------

  /**
   * Daily: expire trials past their end date, and log (stubbed) reminders at
   * the configured day thresholds. A borrowed-early piece of Module 35
   * (Background Jobs) — Free Trial can't function without it.
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async processTrialLifecycle(): Promise<void> {
    const trialSettings = await this.getTrialSettings();
    const now = new Date();

    const expiring = await this.subscriptionsRepository.find({
      where: { status: SubscriptionStatus.TRIAL },
    });

    for (const subscription of expiring) {
      if (!subscription.trialEndsAt) continue;
      const msRemaining = subscription.trialEndsAt.getTime() - now.getTime();
      const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));

      if (msRemaining <= 0) {
        await this.expireTrial(subscription.id, subscription.restaurantId);
        continue;
      }

      if (trialSettings.reminderScheduleDays.includes(daysRemaining)) {
        await this.sendTrialReminderIfNotAlreadySent(subscription.id, subscription.restaurantId, daysRemaining);
      }
    }
  }

  private async expireTrial(subscriptionId: string, restaurantId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.update(RestaurantSubscription, subscriptionId, { status: SubscriptionStatus.EXPIRED });
      await manager.save(
        manager.create(SubscriptionEvent, {
          restaurantId,
          subscriptionId,
          type: SubscriptionEventType.TRIAL_EXPIRED,
          metadata: null,
        }),
      );
    });
    this.logger.log(`Trial expired for restaurant ${restaurantId}`);
  }

  private async sendTrialReminderIfNotAlreadySent(
    subscriptionId: string,
    restaurantId: string,
    daysRemaining: number,
  ): Promise<void> {
    // Must be scoped to THIS day-count specifically — the reminder schedule
    // fires multiple times per trial (30/15/7/3/1 days out), so a check
    // against "any reminder ever sent" would fire only the first one.
    const alreadySent = await this.eventsRepository
      .createQueryBuilder("event")
      .where("event.subscription_id = :subscriptionId", { subscriptionId })
      .andWhere("event.type = :type", { type: SubscriptionEventType.TRIAL_REMINDER_SENT })
      .andWhere("event.metadata ->> 'daysRemaining' = :daysRemaining", { daysRemaining: String(daysRemaining) })
      .getExists();
    if (alreadySent) return;

    await this.eventsRepository.save(
      this.eventsRepository.create({
        restaurantId,
        subscriptionId,
        type: SubscriptionEventType.TRIAL_REMINDER_SENT,
        metadata: { daysRemaining },
      }),
    );
    // Notifications module (§29) isn't built yet — log so the flow is testable end-to-end.
    console.log(`[trial-reminder] restaurant=${restaurantId} daysRemaining=${daysRemaining}`);
  }
}
