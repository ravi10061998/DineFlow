import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, QueryFailedError, Repository } from "typeorm";
import { Coupon } from "./entities/coupon.entity";
import { CouponRedemption } from "./entities/coupon-redemption.entity";
import { CreateCouponDto } from "./dto/create-coupon.dto";
import { UpdateCouponDto } from "./dto/update-coupon.dto";
import { CommissionType } from "../../common/enums/commission-type.enum";
import { CouponErrors } from "../../common/exceptions/business.exception";

const UNIQUE_VIOLATION = "23505";

export interface CouponValidationParams {
  code: string;
  customerId: string;
  restaurantId: string;
  restaurantName: string;
  subtotal: number;
}

export interface CouponValidationResult {
  coupon: Coupon;
  discountAmount: string;
}

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(Coupon) private readonly couponsRepository: Repository<Coupon>,
    @InjectRepository(CouponRedemption) private readonly redemptionsRepository: Repository<CouponRedemption>,
  ) {}

  findAllForAdmin(): Promise<Coupon[]> {
    return this.couponsRepository.find({ order: { createdAt: "DESC" } });
  }

  async findOneOrThrow(id: string): Promise<Coupon> {
    const coupon = await this.couponsRepository.findOne({ where: { id } });
    if (!coupon) throw new NotFoundException("Coupon not found");
    return coupon;
  }

  findRedemptionsForAdmin(couponId: string): Promise<CouponRedemption[]> {
    return this.redemptionsRepository.find({
      where: { couponId },
      relations: { customer: true, order: true },
      order: { createdAt: "DESC" },
    });
  }

  async create(dto: CreateCouponDto): Promise<Coupon> {
    const coupon = this.couponsRepository.create({
      code: dto.code.toUpperCase(),
      description: dto.description ?? null,
      discountType: dto.discountType,
      discountValue: String(dto.discountValue),
      minOrderAmount: dto.minOrderAmount !== undefined ? String(dto.minOrderAmount) : null,
      maxDiscountAmount: dto.maxDiscountAmount !== undefined ? String(dto.maxDiscountAmount) : null,
      restaurantId: dto.restaurantId ?? null,
      perCustomerLimit: dto.perCustomerLimit ?? 1,
      totalRedemptionLimit: dto.totalRedemptionLimit ?? null,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });
    try {
      return await this.couponsRepository.save(coupon);
    } catch (err) {
      throw this.mapDuplicateCode(err, coupon.code);
    }
  }

  async update(id: string, dto: UpdateCouponDto): Promise<Coupon> {
    const coupon = await this.findOneOrThrow(id);
    Object.assign(coupon, {
      ...dto,
      code: dto.code !== undefined ? dto.code.toUpperCase() : coupon.code,
      discountValue: dto.discountValue !== undefined ? String(dto.discountValue) : coupon.discountValue,
      minOrderAmount: dto.minOrderAmount !== undefined ? String(dto.minOrderAmount) : coupon.minOrderAmount,
      maxDiscountAmount: dto.maxDiscountAmount !== undefined ? String(dto.maxDiscountAmount) : coupon.maxDiscountAmount,
      startsAt: dto.startsAt !== undefined ? (dto.startsAt ? new Date(dto.startsAt) : null) : coupon.startsAt,
      expiresAt: dto.expiresAt !== undefined ? (dto.expiresAt ? new Date(dto.expiresAt) : null) : coupon.expiresAt,
    });
    try {
      return await this.couponsRepository.save(coupon);
    } catch (err) {
      throw this.mapDuplicateCode(err, coupon.code);
    }
  }

  async remove(id: string): Promise<void> {
    const coupon = await this.findOneOrThrow(id);
    await this.couponsRepository.remove(coupon);
  }

  /**
   * Read-only validation for the cart-page live preview — no locking, no
   * redemption row created. A coupon that passes here can still legitimately
   * fail at real checkout (expired/limit-reached in the interim); the
   * preview is a convenience, not a reservation.
   */
  async preview(params: CouponValidationParams): Promise<CouponValidationResult> {
    return this.validate(this.couponsRepository.manager, params, false);
  }

  /**
   * The real, enforced validation — MUST be called with the same
   * `EntityManager` that is about to create the order, inside that same
   * transaction. Row-locks the coupon so two concurrent checkouts racing
   * against the same near-exhausted limit serialize instead of both
   * succeeding. Does not itself create the redemption row (the order doesn't
   * have an id yet) — call `recordRedemption` right after the order saves.
   */
  async validateAndLock(manager: EntityManager, params: CouponValidationParams): Promise<CouponValidationResult> {
    return this.validate(manager, params, true);
  }

  async recordRedemption(manager: EntityManager, couponId: string, customerId: string, orderId: string, discountAmount: string): Promise<void> {
    const redemption = manager.create(CouponRedemption, { couponId, customerId, orderId, discountAmount });
    await manager.save(redemption);
  }

  private async validate(manager: EntityManager, params: CouponValidationParams, lock: boolean): Promise<CouponValidationResult> {
    const { code, customerId, restaurantId, restaurantName, subtotal } = params;
    const normalizedCode = code.trim().toUpperCase();

    const coupon = lock
      ? await manager
          .createQueryBuilder(Coupon, "coupon")
          .where("coupon.code = :code", { code: normalizedCode })
          .setLock("pessimistic_write")
          .getOne()
      : await manager.findOne(Coupon, { where: { code: normalizedCode } });
    if (!coupon) throw CouponErrors.notFound();
    if (!coupon.isActive) throw CouponErrors.inactive();

    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now) throw CouponErrors.notYetActive();
    if (coupon.expiresAt && coupon.expiresAt < now) throw CouponErrors.expired();
    if (coupon.restaurantId && coupon.restaurantId !== restaurantId) throw CouponErrors.notApplicable(restaurantName);
    if (coupon.minOrderAmount && subtotal < Number(coupon.minOrderAmount)) throw CouponErrors.minOrderNotMet(coupon.minOrderAmount);

    if (coupon.totalRedemptionLimit !== null) {
      const totalCount = await manager.count(CouponRedemption, { where: { couponId: coupon.id } });
      if (totalCount >= coupon.totalRedemptionLimit) throw CouponErrors.totalLimitReached();
    }

    const customerCount = await manager.count(CouponRedemption, { where: { couponId: coupon.id, customerId } });
    if (customerCount >= coupon.perCustomerLimit) throw CouponErrors.customerLimitReached();

    return { coupon, discountAmount: this.computeDiscount(coupon, subtotal) };
  }

  private computeDiscount(coupon: Coupon, subtotal: number): string {
    let discount =
      coupon.discountType === CommissionType.PERCENTAGE ? (subtotal * Number(coupon.discountValue)) / 100 : Number(coupon.discountValue);
    if (coupon.maxDiscountAmount !== null) discount = Math.min(discount, Number(coupon.maxDiscountAmount));
    // Never discount more than the order is actually worth — the delivery fee is added back on top of this.
    discount = Math.min(discount, subtotal);
    return discount.toFixed(2);
  }

  private mapDuplicateCode(err: unknown, code: string): unknown {
    if (err instanceof QueryFailedError && (err as unknown as { code?: string }).code === UNIQUE_VIOLATION) {
      return CouponErrors.codeTaken(code);
    }
    return err;
  }
}
