import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { DataSource } from "typeorm";
import { RestaurantsService } from "./restaurants.service";
import { Restaurant, RestaurantStatus } from "./entities/restaurant.entity";
import { RestaurantBusinessHours } from "./entities/restaurant-business-hours.entity";
import { RestaurantHoliday } from "./entities/restaurant-holiday.entity";
import { RestaurantStatusHistory } from "./entities/restaurant-status-history.entity";
import { UsersService } from "../users/users.service";
import { RolesService } from "../roles/roles.service";

describe("RestaurantsService", () => {
  let service: RestaurantsService;
  let restaurantsRepo: { exists: jest.Mock };
  let usersService: { findByEmail: jest.Mock };
  let rolesService: { findByName: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    restaurantsRepo = { exists: jest.fn().mockResolvedValue(false) };
    usersService = { findByEmail: jest.fn() };
    rolesService = { findByName: jest.fn() };
    dataSource = { transaction: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        RestaurantsService,
        { provide: getRepositoryToken(Restaurant), useValue: restaurantsRepo },
        { provide: getRepositoryToken(RestaurantBusinessHours), useValue: {} },
        { provide: getRepositoryToken(RestaurantHoliday), useValue: {} },
        { provide: getRepositoryToken(RestaurantStatusHistory), useValue: {} },
        { provide: UsersService, useValue: usersService },
        { provide: RolesService, useValue: rolesService },
        { provide: DataSource, useValue: dataSource },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(RestaurantsService);
  });

  describe("register", () => {
    it("rejects when the email is already registered", async () => {
      usersService.findByEmail.mockResolvedValue({ id: "existing-user" });

      await expect(
        service.register({
          restaurantName: "Spice Route",
          ownerFullName: "Ravi Kumar",
          email: "ravi@example.com",
          password: "Password123!",
          phone: "+919876543210",
          addressLine1: "12 MG Road",
          city: "Bengaluru",
          state: "KA",
          postalCode: "560001",
          country: "in",
        }),
      ).rejects.toMatchObject({ code: "EMAIL_ALREADY_REGISTERED" });
    });

    it("uniques the slug by appending a numeric suffix on collision", async () => {
      usersService.findByEmail.mockResolvedValue(null);
      rolesService.findByName.mockResolvedValue({ id: "role-restaurant-admin", name: "RESTAURANT_ADMIN" });
      restaurantsRepo.exists.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

      let savedRestaurant: any;
      dataSource.transaction.mockImplementation(async (cb: any) =>
        cb({
          create: (_entity: any, data: any) => data,
          save: async (entity: any) => {
            if (entity.slug !== undefined) savedRestaurant = entity;
            return entity;
          },
        }),
      );

      await service.register({
        restaurantName: "Spice Route",
        ownerFullName: "Ravi Kumar",
        email: "ravi@example.com",
        password: "Password123!",
        phone: "+919876543210",
        addressLine1: "12 MG Road",
        city: "Bengaluru",
        state: "KA",
        postalCode: "560001",
        country: "in",
      });

      expect(savedRestaurant.slug).toBe("spice-route-2");
    });
  });

  describe("status transitions", () => {
    it("refuses to approve a BLOCKED restaurant", async () => {
      dataSource.transaction.mockImplementation(async (cb: any) =>
        cb({
          findOne: async () => ({ id: "r1", status: RestaurantStatus.BLOCKED }),
          save: jest.fn(),
          create: (_entity: any, data: any) => data,
        }),
      );

      await expect(service.approve("r1", "admin-1")).rejects.toMatchObject({ code: "INVALID_STATUS_TRANSITION" });
    });

    it("allows PENDING -> APPROVED and records status history", async () => {
      const saved: any[] = [];
      dataSource.transaction.mockImplementation(async (cb: any) =>
        cb({
          findOne: async () => ({ id: "r1", status: RestaurantStatus.PENDING }),
          save: async (entity: any) => {
            saved.push(entity);
            return entity;
          },
          create: (_entity: any, data: any) => data,
        }),
      );

      const result = await service.approve("r1", "admin-1");

      expect(result.status).toBe(RestaurantStatus.APPROVED);
      expect(saved.some((e) => e.toStatus === RestaurantStatus.APPROVED && e.changedByUserId === "admin-1")).toBe(
        true,
      );
    });
  });
});
