import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException } from "@nestjs/common";
import { RestaurantBankAccountService } from "./restaurant-bank-account.service";
import { RestaurantBankAccount, RestaurantBankAccountStatus } from "./entities/restaurant-bank-account.entity";

describe("RestaurantBankAccountService", () => {
  let service: RestaurantBankAccountService;
  let repo: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; find: jest.Mock; update: jest.Mock };

  beforeEach(async () => {
    repo = {
      create: jest.fn((x) => ({ ...x })),
      save: jest.fn(async (x) => x),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [RestaurantBankAccountService, { provide: getRepositoryToken(RestaurantBankAccount), useValue: repo }],
    }).compile();

    service = moduleRef.get(RestaurantBankAccountService);
  });

  describe("setBankAccount", () => {
    const dto = { accountHolderName: "Chai Bagwan", accountNumber: "123456789012", ifscCode: "hdfc0001234", bankName: "HDFC Bank" };

    it("creates a new PENDING account when none exists yet", async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.setBankAccount("r1", dto);

      expect(result.status).toBe(RestaurantBankAccountStatus.PENDING);
      expect(result.ifscCode).toBe("HDFC0001234"); // uppercased
    });

    it("rebinding an existing VERIFIED account resets it to PENDING and clears RazorpayX linkage", async () => {
      repo.findOne.mockResolvedValue({
        id: "ba1",
        restaurantId: "r1",
        status: RestaurantBankAccountStatus.VERIFIED,
        razorpayContactId: "cont_1",
        razorpayFundAccountId: "fa_1",
      });

      const result = await service.setBankAccount("r1", dto);

      expect(result.status).toBe(RestaurantBankAccountStatus.PENDING);
      expect(result.razorpayContactId).toBeNull();
      expect(result.razorpayFundAccountId).toBeNull();
    });
  });

  describe("verify / reject", () => {
    it("throws NotFoundException verifying a restaurant with no bank account submitted", async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.verify("r1")).rejects.toThrow(NotFoundException);
    });

    it("refuses to re-verify an already-verified account", async () => {
      repo.findOne.mockResolvedValue({ id: "ba1", status: RestaurantBankAccountStatus.VERIFIED });
      await expect(service.verify("r1")).rejects.toMatchObject({ code: "BANK_ACCOUNT_ALREADY_VERIFIED" });
    });

    it("verify moves a PENDING account to VERIFIED and clears any prior rejection reason", async () => {
      repo.findOne.mockResolvedValue({ id: "ba1", status: RestaurantBankAccountStatus.PENDING, rejectionReason: "old reason" });

      const result = await service.verify("r1");

      expect(result.status).toBe(RestaurantBankAccountStatus.VERIFIED);
      expect(result.rejectionReason).toBeNull();
    });

    it("reject records the reason and moves status to REJECTED", async () => {
      repo.findOne.mockResolvedValue({ id: "ba1", status: RestaurantBankAccountStatus.PENDING });

      const result = await service.reject("r1", "Account holder name mismatch");

      expect(result.status).toBe(RestaurantBankAccountStatus.REJECTED);
      expect(result.rejectionReason).toBe("Account holder name mismatch");
    });
  });

  describe("toSafeResponse", () => {
    it("masks the account number to its last 4 digits and never includes the full number", () => {
      const account = {
        id: "ba1",
        accountHolderName: "Chai Bagwan",
        accountNumber: "123456789012",
        ifscCode: "HDFC0001234",
        bankName: "HDFC Bank",
        status: RestaurantBankAccountStatus.VERIFIED,
        rejectionReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as RestaurantBankAccount;

      const safe = service.toSafeResponse(account);

      expect(safe.maskedAccountNumber).toBe("••••9012");
      expect(JSON.stringify(safe)).not.toContain("123456789012");
    });
  });
});
