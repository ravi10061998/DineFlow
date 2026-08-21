import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, IsNull, LessThanOrEqual, MoreThanOrEqual, Repository } from "typeorm";
import { CommissionRule } from "./entities/commission-rule.entity";
import { CreateCommissionRuleDto } from "./dto/create-commission-rule.dto";
import { UpdateCommissionRuleDto } from "./dto/update-commission-rule.dto";
import { CommissionType } from "../../common/enums/commission-type.enum";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import { SubscriptionStatus } from "../subscriptions/entities/restaurant-subscription.entity";
import { CommissionErrors } from "../../common/exceptions/business.exception";

export type CommissionSource = "RESTAURANT_OVERRIDE" | "PLAN" | "TRIAL";

export interface EffectiveCommission {
  source: CommissionSource;
  commissionType: CommissionType;
  commissionValue: number;
}

export interface CommissionCalculation extends EffectiveCommission {
  amount: number;
  platformAmount: number;
  restaurantAmount: number;
}

@Injectable()
export class CommissionService {
  constructor(
    @InjectRepository(CommissionRule) private readonly rulesRepository: Repository<CommissionRule>,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly dataSource: DataSource,
  ) {}

  findAllForRestaurant(restaurantId: string): Promise<CommissionRule[]> {
    return this.rulesRepository.find({ where: { restaurantId }, order: { createdAt: "DESC" } });
  }

  async findRuleOrThrow(id: string): Promise<CommissionRule> {
    const rule = await this.rulesRepository.findOne({ where: { id } });
    if (!rule) throw new NotFoundException("Commission rule not found");
    return rule;
  }

  private async findActiveOverride(restaurantId: string): Promise<CommissionRule | null> {
    const now = new Date();
    // "Currently valid" = is_active AND (no validFrom or validFrom <= now) AND (no validTo or validTo >= now).
    // Expressed as two queries ORed together per bound, since TypeORM's `Or`
    // doesn't compose across independently-nullable columns cleanly.
    const candidates = await this.rulesRepository.find({
      where: [
        { restaurantId, isActive: true, validFrom: IsNull(), validTo: IsNull() },
        { restaurantId, isActive: true, validFrom: LessThanOrEqual(now), validTo: IsNull() },
        { restaurantId, isActive: true, validFrom: IsNull(), validTo: MoreThanOrEqual(now) },
        { restaurantId, isActive: true, validFrom: LessThanOrEqual(now), validTo: MoreThanOrEqual(now) },
      ],
      order: { createdAt: "DESC" },
    });
    return candidates[0] ?? null;
  }

  async getEffectiveCommission(restaurantId: string): Promise<EffectiveCommission> {
    const override = await this.findActiveOverride(restaurantId);
    if (override) {
      return {
        source: "RESTAURANT_OVERRIDE",
        commissionType: override.commissionType,
        commissionValue: Number(override.commissionValue),
      };
    }

    const subscription = await this.subscriptionsService.findForRestaurantOrNull(restaurantId);

    if (subscription?.status === SubscriptionStatus.ACTIVE && subscription.commissionTypeSnapshot) {
      return {
        source: "PLAN",
        commissionType: subscription.commissionTypeSnapshot,
        commissionValue: Number(subscription.commissionValueSnapshot),
      };
    }

    if (subscription?.status === SubscriptionStatus.TRIAL) {
      const trialSettings = await this.subscriptionsService.getTrialSettings();
      return {
        source: "TRIAL",
        commissionType: trialSettings.trialCommissionType,
        commissionValue: Number(trialSettings.trialCommissionValue),
      };
    }

    throw CommissionErrors.noCommissionSource();
  }

  async calculateCommission(restaurantId: string, amount: number): Promise<CommissionCalculation> {
    const effective = await this.getEffectiveCommission(restaurantId);

    const rawPlatformAmount =
      effective.commissionType === CommissionType.PERCENTAGE
        ? (amount * effective.commissionValue) / 100
        : effective.commissionValue;

    // Clamp: a fixed commission can never exceed the order amount (never a negative restaurant payout).
    const platformAmount = Math.min(Math.round(rawPlatformAmount * 100) / 100, amount);
    const restaurantAmount = Math.round((amount - platformAmount) * 100) / 100;

    return { ...effective, amount, platformAmount, restaurantAmount };
  }

  async createRule(dto: CreateCommissionRuleDto, createdByUserId: string): Promise<CommissionRule> {
    return this.dataSource.transaction(async (manager) => {
      await manager.update(CommissionRule, { restaurantId: dto.restaurantId, isActive: true }, { isActive: false });

      const rule = manager.create(CommissionRule, {
        restaurantId: dto.restaurantId,
        commissionType: dto.commissionType,
        commissionValue: String(dto.commissionValue),
        reason: dto.reason,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validTo: dto.validTo ? new Date(dto.validTo) : null,
        isActive: true,
        createdByUserId,
      });
      return manager.save(rule);
    });
  }

  async updateRule(id: string, dto: UpdateCommissionRuleDto): Promise<CommissionRule> {
    const rule = await this.findRuleOrThrow(id);

    return this.dataSource.transaction(async (manager) => {
      if (dto.isActive === true && !rule.isActive) {
        await manager.update(CommissionRule, { restaurantId: rule.restaurantId, isActive: true }, { isActive: false });
      }
      Object.assign(rule, {
        ...dto,
        validTo: dto.validTo !== undefined ? new Date(dto.validTo) : rule.validTo,
      });
      return manager.save(rule);
    });
  }
}
