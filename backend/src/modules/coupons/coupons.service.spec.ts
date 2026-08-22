import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { QueryFailedError } from "typeorm";
import { CouponsService } from "./coupons.service";
import { Coupon } from "./entities/coupon.entity";
import { CouponRedemption } from "./entities/coupon-redemption.entity";
import { CommissionType } from "../../common/enums/commission-type.enum";

describe("CouponsService", () => {
  let service: CouponsService;
  let couponsRepo: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; remove: jest.Mock; find: jest.Mock; manager: any };
  let redemptionsRepo: { find: jest.Mock };
  let manager: { findOne: jest.Mock; count: jest.Mock; create: jest.Mock; save: jest.Mock; createQueryBuilder: jest.Mock };

  const baseCoupon: Coupon = {
    id: "coup1",
    code: "DINE50",
    description: null,
    discountType: CommissionType.FIXED,
    discountValue: "50.00",
    minOrderAmount: null,
    maxDiscountAmount: null,
    restaurantId: null,
    perCustomerLimit: 1,
    totalRedemptionLimit: null,
    startsAt: null,
    expiresAt: null,
    isActive: true,
  } as Coupon;

  beforeEach(async () => {
    manager = {
      findOne: jest.fn().mockResolvedValue(baseCoupon),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn((_entity, data) => data),
      save: jest.fn(async (x) => x),
      createQueryBuilder: jest.fn(),
    };
    couponsRepo = {
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
      findOne: jest.fn(),
      remove: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      manager,
    };
    redemptionsRepo = { find: jest.fn().mockResolvedValue([]) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CouponsService,
        { provide: getRepositoryToken(Coupon), useValue: couponsRepo },
        { provide: getRepositoryToken(CouponRedemption), useValue: redemptionsRepo },
      ],
    }).compile();

    service = moduleRef.get(CouponsService);
  });

  describe("create", () => {
    it("uppercases the code", async () => {
      const result = await service.create({ code: "dine50", discountType: CommissionType.FIXED, discountValue: 50 });
      expect(result.code).toBe("DINE50");
    });

    it("maps a duplicate code to COUPON_CODE_TAKEN", async () => {
      const dbError = Object.assign(new QueryFailedError("insert", [], new Error("duplicate")), { code: "23505" });
      couponsRepo.save.mockRejectedValue(dbError);

      await expect(service.create({ code: "DINE50", discountType: CommissionType.FIXED, discountValue: 50 })).rejects.toMatchObject({
        code: "COUPON_CODE_TAKEN",
      });
    });
  });

  describe("preview (unlocked validation)", () => {
    const params = { code: "dine50", customerId: "c1", restaurantId: "r1", restaurantName: "Test Diner", subtotal: 500 };

    it("computes a FIXED discount", async () => {
      const result = await service.preview(params);
      expect(result.discountAmount).toBe("50.00");
    });

    it("computes a PERCENTAGE discount capped by maxDiscountAmount", async () => {
      manager.findOne.mockResolvedValue({ ...baseCoupon, discountType: CommissionType.PERCENTAGE, discountValue: "20.00", maxDiscountAmount: "60.00" });
      const result = await service.preview(params); // 20% of 500 = 100, capped to 60
      expect(result.discountAmount).toBe("60.00");
    });

    it("never discounts more than the subtotal itself", async () => {
      manager.findOne.mockResolvedValue({ ...baseCoupon, discountValue: "9999.00" });
      const result = await service.preview(params);
      expect(result.discountAmount).toBe("500.00");
    });

    it("rejects an unknown code", async () => {
      manager.findOne.mockResolvedValue(null);
      await expect(service.preview(params)).rejects.toMatchObject({ code: "COUPON_NOT_FOUND" });
    });

    it("rejects an inactive coupon", async () => {
      manager.findOne.mockResolvedValue({ ...baseCoupon, isActive: false });
      await expect(service.preview(params)).rejects.toMatchObject({ code: "COUPON_INACTIVE" });
    });

    it("rejects an expired coupon", async () => {
      manager.findOne.mockResolvedValue({ ...baseCoupon, expiresAt: new Date("2000-01-01") });
      await expect(service.preview(params)).rejects.toMatchObject({ code: "COUPON_EXPIRED" });
    });

    it("rejects a coupon that hasn't started yet", async () => {
      manager.findOne.mockResolvedValue({ ...baseCoupon, startsAt: new Date("2999-01-01") });
      await expect(service.preview(params)).rejects.toMatchObject({ code: "COUPON_NOT_YET_ACTIVE" });
    });

    it("rejects when the order is below the coupon's minimum", async () => {
      manager.findOne.mockResolvedValue({ ...baseCoupon, minOrderAmount: "600.00" });
      await expect(service.preview(params)).rejects.toMatchObject({ code: "COUPON_MIN_ORDER_NOT_MET" });
    });

    it("rejects a restaurant-scoped coupon used against a different restaurant", async () => {
      manager.findOne.mockResolvedValue({ ...baseCoupon, restaurantId: "other-restaurant" });
      await expect(service.preview(params)).rejects.toMatchObject({ code: "COUPON_NOT_APPLICABLE" });
    });

    it("allows a restaurant-scoped coupon used at its own restaurant", async () => {
      manager.findOne.mockResolvedValue({ ...baseCoupon, restaurantId: "r1" });
      await expect(service.preview(params)).resolves.toMatchObject({ discountAmount: "50.00" });
    });

    it("rejects once the per-customer limit is reached", async () => {
      manager.count.mockResolvedValue(1); // perCustomerLimit defaults to 1
      await expect(service.preview(params)).rejects.toMatchObject({ code: "COUPON_CUSTOMER_LIMIT_REACHED" });
    });

    it("rejects once the total redemption limit is reached", async () => {
      manager.findOne.mockResolvedValue({ ...baseCoupon, totalRedemptionLimit: 5, perCustomerLimit: 100 });
      manager.count.mockResolvedValue(5);
      await expect(service.preview(params)).rejects.toMatchObject({ code: "COUPON_TOTAL_LIMIT_REACHED" });
    });
  });

  describe("validateAndLock", () => {
    it("row-locks via a query builder instead of a plain findOne", async () => {
      const qb = { where: jest.fn().mockReturnThis(), setLock: jest.fn().mockReturnThis(), getOne: jest.fn().mockResolvedValue(baseCoupon) };
      manager.createQueryBuilder.mockReturnValue(qb);

      await service.validateAndLock(manager as any, { code: "DINE50", customerId: "c1", restaurantId: "r1", restaurantName: "Test Diner", subtotal: 500 });

      expect(qb.setLock).toHaveBeenCalledWith("pessimistic_write");
      expect(manager.findOne).not.toHaveBeenCalled();
    });
  });

  describe("recordRedemption", () => {
    it("creates and saves a redemption row via the given manager", async () => {
      await service.recordRedemption(manager as any, "coup1", "c1", "order1", "50.00");
      expect(manager.create).toHaveBeenCalledWith(CouponRedemption, { couponId: "coup1", customerId: "c1", orderId: "order1", discountAmount: "50.00" });
      expect(manager.save).toHaveBeenCalled();
    });
  });
});
