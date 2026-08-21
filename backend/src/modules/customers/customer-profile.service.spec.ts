import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource, QueryFailedError } from "typeorm";
import { CustomerProfileService } from "./customer-profile.service";
import { CustomerProfile, Gender } from "./entities/customer-profile.entity";
import { UsersService } from "../users/users.service";
import { User } from "../users/entities/user.entity";

describe("CustomerProfileService", () => {
  let service: CustomerProfileService;
  let profilesRepo: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock };
  let usersService: { findById: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  const baseUser = { id: "u1", email: "cust@example.com", fullName: "Casey Customer", phone: "+919999999999" } as User;

  beforeEach(async () => {
    profilesRepo = {
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
      findOne: jest.fn(),
    };
    usersService = { findById: jest.fn().mockResolvedValue(baseUser) };
    dataSource = { transaction: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CustomerProfileService,
        { provide: getRepositoryToken(CustomerProfile), useValue: profilesRepo },
        { provide: UsersService, useValue: usersService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = moduleRef.get(CustomerProfileService);
  });

  describe("findOrCreateProfile", () => {
    it("returns the existing profile row when one exists", async () => {
      const existing = { id: "p1", userId: "u1" };
      profilesRepo.findOne.mockResolvedValue(existing);

      const result = await service.findOrCreateProfile("u1");

      expect(result).toBe(existing);
      expect(profilesRepo.save).not.toHaveBeenCalled();
    });

    it("lazily creates a profile row when none exists yet", async () => {
      profilesRepo.findOne.mockResolvedValue(null);

      const result = await service.findOrCreateProfile("u1");

      expect(result.userId).toBe("u1");
      expect(profilesRepo.save).toHaveBeenCalled();
    });
  });

  describe("getProfile", () => {
    it("merges user fields with profile fields", async () => {
      profilesRepo.findOne.mockResolvedValue({
        userId: "u1",
        dateOfBirth: "1990-01-01",
        gender: Gender.OTHER,
        profilePhotoPath: null,
        profilePhotoOriginalName: null,
        profilePhotoMimeType: null,
      });

      const view = await service.getProfile("u1");

      expect(view).toMatchObject({
        id: "u1",
        email: "cust@example.com",
        fullName: "Casey Customer",
        dateOfBirth: "1990-01-01",
        gender: Gender.OTHER,
        profilePhoto: null,
      });
    });

    it("surfaces a set profile photo as a small descriptor, not the raw path", async () => {
      profilesRepo.findOne.mockResolvedValue({
        userId: "u1",
        dateOfBirth: null,
        gender: null,
        profilePhotoPath: "u1/abc.jpg",
        profilePhotoOriginalName: "me.jpg",
        profilePhotoMimeType: "image/jpeg",
      });

      const view = await service.getProfile("u1");

      expect(view.profilePhoto).toEqual({ originalFileName: "me.jpg", mimeType: "image/jpeg" });
    });
  });

  describe("updateProfile", () => {
    it("updates user fields and profile fields in one transaction", async () => {
      profilesRepo.findOne.mockResolvedValue({ userId: "u1" });
      const updateCalls: any[] = [];
      dataSource.transaction.mockImplementation(async (cb: any) =>
        cb({ update: async (...args: any[]) => updateCalls.push(args) }),
      );

      await service.updateProfile("u1", { fullName: "New Name", dateOfBirth: "1995-05-05" });

      expect(updateCalls).toContainEqual([User, "u1", { fullName: "New Name" }]);
      expect(updateCalls).toContainEqual([CustomerProfile, { userId: "u1" }, { dateOfBirth: "1995-05-05" }]);
    });

    it("maps a phone unique-constraint violation to PHONE_ALREADY_IN_USE", async () => {
      profilesRepo.findOne.mockResolvedValue({ userId: "u1" });
      const dbError = Object.assign(new QueryFailedError("update", [], new Error("duplicate")), { code: "23505" });
      dataSource.transaction.mockRejectedValue(dbError);

      await expect(service.updateProfile("u1", { phone: "+911234567890" })).rejects.toMatchObject({
        code: "PHONE_ALREADY_IN_USE",
      });
    });

    it("lets an unrelated database error propagate unchanged", async () => {
      profilesRepo.findOne.mockResolvedValue({ userId: "u1" });
      const otherError = new Error("connection lost");
      dataSource.transaction.mockRejectedValue(otherError);

      await expect(service.updateProfile("u1", { phone: "+911234567890" })).rejects.toBe(otherError);
    });
  });
});
