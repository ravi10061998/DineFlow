import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { QueryFailedError } from "typeorm";
import { OffersService } from "./offers.service";
import { Offer } from "./entities/offer.entity";
import { CommissionType } from "../../common/enums/commission-type.enum";

describe("OffersService", () => {
  let service: OffersService;
  let repo: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; remove: jest.Mock; find: jest.Mock };

  beforeEach(async () => {
    repo = {
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
      findOne: jest.fn(),
      remove: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [OffersService, { provide: getRepositoryToken(Offer), useValue: repo }],
    }).compile();

    service = moduleRef.get(OffersService);
  });

  it("uppercases the coupon code on create", async () => {
    const result = await service.create({ code: "dine100", title: "Flat 100 off", discountType: CommissionType.FIXED, discountValue: 100 });

    expect(result.code).toBe("DINE100");
  });

  it("maps a duplicate code to OFFER_CODE_TAKEN", async () => {
    const dbError = Object.assign(new QueryFailedError("insert", [], new Error("duplicate")), { code: "23505" });
    repo.save.mockRejectedValue(dbError);

    await expect(
      service.create({ code: "DINE100", title: "Flat 100 off", discountType: CommissionType.FIXED, discountValue: 100 }),
    ).rejects.toMatchObject({ code: "OFFER_CODE_TAKEN" });
  });

  it("queries both no-expiry and not-yet-expired offers for the storefront", async () => {
    await service.findActiveForStore();

    const args = repo.find.mock.calls[0][0];
    expect(args.where).toHaveLength(2);
  });
});
