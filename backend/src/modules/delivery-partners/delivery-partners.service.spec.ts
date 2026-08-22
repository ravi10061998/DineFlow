import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { DeliveryPartnersService } from "./delivery-partners.service";
import { DeliveryPartner, DeliveryPartnerStatus, VehicleType } from "./entities/delivery-partner.entity";
import { DeliveryPartnerStatusHistory } from "./entities/delivery-partner-status-history.entity";
import { UsersService } from "../users/users.service";
import { RolesService } from "../roles/roles.service";

describe("DeliveryPartnersService", () => {
  let service: DeliveryPartnersService;
  let partnersRepo: { findOne: jest.Mock; find: jest.Mock; save: jest.Mock };
  let usersService: { findByEmail: jest.Mock };
  let rolesService: { findByName: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  const registerDto = {
    fullName: "Rider One",
    email: "rider@example.com",
    password: "Password123!",
    phone: "+919876543210",
    vehicleType: VehicleType.BIKE,
    vehicleNumber: "KA01AB1234",
    licenseNumber: "DL123456",
  };

  beforeEach(async () => {
    partnersRepo = { findOne: jest.fn(), find: jest.fn().mockResolvedValue([]), save: jest.fn(async (x) => x) };
    usersService = { findByEmail: jest.fn() };
    rolesService = { findByName: jest.fn() };
    dataSource = { transaction: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        DeliveryPartnersService,
        { provide: getRepositoryToken(DeliveryPartner), useValue: partnersRepo },
        { provide: getRepositoryToken(DeliveryPartnerStatusHistory), useValue: {} },
        { provide: UsersService, useValue: usersService },
        { provide: RolesService, useValue: rolesService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = moduleRef.get(DeliveryPartnersService);
  });

  describe("register", () => {
    it("rejects when the email is already registered", async () => {
      usersService.findByEmail.mockResolvedValue({ id: "existing-user" });

      await expect(service.register(registerDto)).rejects.toMatchObject({ code: "EMAIL_ALREADY_REGISTERED" });
    });

    it("creates the user and delivery-partner profile atomically as PENDING", async () => {
      usersService.findByEmail.mockResolvedValue(null);
      rolesService.findByName.mockResolvedValue({ id: "role-dp", name: "DELIVERY_PARTNER" });

      let savedPartner: any;
      dataSource.transaction.mockImplementation(async (cb: any) =>
        cb({
          create: (_entity: any, data: any) => data,
          save: async (entity: any) => {
            if (entity.vehicleType !== undefined) savedPartner = entity;
            if (entity.email !== undefined) entity.id = "user-1";
            return entity;
          },
        }),
      );

      const result = await service.register(registerDto);

      expect(savedPartner.status).toBe(DeliveryPartnerStatus.PENDING);
      expect(savedPartner.userId).toBe("user-1");
      expect(result.partner.status).toBe(DeliveryPartnerStatus.PENDING);
    });
  });

  describe("status transitions", () => {
    it("refuses to approve a BLOCKED partner", async () => {
      dataSource.transaction.mockImplementation(async (cb: any) =>
        cb({ findOne: async () => ({ id: "p1", status: DeliveryPartnerStatus.BLOCKED }) }),
      );

      await expect(service.approve("p1", "admin-1")).rejects.toMatchObject({ code: "INVALID_STATUS_TRANSITION" });
    });

    it("allows PENDING -> APPROVED and records status history", async () => {
      const saved: any[] = [];
      dataSource.transaction.mockImplementation(async (cb: any) =>
        cb({
          findOne: async () => ({ id: "p1", status: DeliveryPartnerStatus.PENDING, isOnline: false }),
          create: (_entity: any, data: any) => data,
          save: async (entity: any) => {
            saved.push(entity);
            return entity;
          },
        }),
      );

      const result = await service.approve("p1", "admin-1");

      expect(result.status).toBe(DeliveryPartnerStatus.APPROVED);
      expect(saved.some((s) => s.toStatus === DeliveryPartnerStatus.APPROVED && s.fromStatus === DeliveryPartnerStatus.PENDING)).toBe(true);
    });

    it("forces isOnline false when suspended, since a suspended partner can't keep accepting deliveries", async () => {
      dataSource.transaction.mockImplementation(async (cb: any) =>
        cb({
          findOne: async () => ({ id: "p1", status: DeliveryPartnerStatus.APPROVED, isOnline: true }),
          create: (_entity: any, data: any) => data,
          save: async (entity: any) => entity,
        }),
      );

      const result = await service.suspend("p1", "admin-1", "background check flagged");

      expect(result.isOnline).toBe(false);
    });
  });

  describe("setOnline", () => {
    it("refuses to go online unless approved", async () => {
      partnersRepo.findOne.mockResolvedValue({ userId: "u1", status: DeliveryPartnerStatus.PENDING, isOnline: false });

      await expect(service.setOnline("u1", true)).rejects.toMatchObject({ code: "DELIVERY_PARTNER_NOT_APPROVED" });
    });

    it("allows going online once approved", async () => {
      partnersRepo.findOne.mockResolvedValue({ userId: "u1", status: DeliveryPartnerStatus.APPROVED, isOnline: false });

      const result = await service.setOnline("u1", true);

      expect(result.isOnline).toBe(true);
    });

    it("always allows going offline regardless of status", async () => {
      partnersRepo.findOne.mockResolvedValue({ userId: "u1", status: DeliveryPartnerStatus.SUSPENDED, isOnline: false });

      const result = await service.setOnline("u1", false);

      expect(result.isOnline).toBe(false);
    });
  });
});
