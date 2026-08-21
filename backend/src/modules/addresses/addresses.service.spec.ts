import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { NotFoundException } from "@nestjs/common";
import { AddressesService } from "./addresses.service";
import { CustomerAddress } from "./entities/customer-address.entity";

describe("AddressesService", () => {
  let service: AddressesService;
  let addressesRepo: { create: jest.Mock; save: jest.Mock; count: jest.Mock; findOne: jest.Mock; remove: jest.Mock; find: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  const baseDto = {
    receiverName: "Casey",
    receiverPhone: "+919999999999",
    addressLine1: "123 Main St",
    city: "Testville",
    state: "TS",
    postalCode: "123456",
    country: "IN",
  };

  beforeEach(async () => {
    addressesRepo = {
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
      count: jest.fn().mockResolvedValue(0),
      findOne: jest.fn(),
      remove: jest.fn(),
      find: jest.fn(),
    };
    dataSource = { transaction: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AddressesService,
        { provide: getRepositoryToken(CustomerAddress), useValue: addressesRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = moduleRef.get(AddressesService);
  });

  describe("create", () => {
    it("forces the first address to be the default even when isDefault isn't requested", async () => {
      addressesRepo.count.mockResolvedValue(0);
      const updateCalls: any[] = [];
      dataSource.transaction.mockImplementation(async (cb: any) =>
        cb({
          update: async (...args: any[]) => updateCalls.push(args),
          create: (Entity: any, data: any) => data,
          save: async (x: any) => x,
        }),
      );

      const result = await service.create("u1", { ...baseDto });

      expect(result.isDefault).toBe(true);
      expect(updateCalls).toContainEqual([CustomerAddress, { userId: "u1" }, { isDefault: false }]);
    });

    it("does not use a transaction for a non-default subsequent address", async () => {
      addressesRepo.count.mockResolvedValue(1);

      const result = await service.create("u1", { ...baseDto });

      expect(result.isDefault).toBe(false);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it("unsets other defaults when a subsequent address explicitly requests isDefault", async () => {
      addressesRepo.count.mockResolvedValue(1);
      const updateCalls: any[] = [];
      dataSource.transaction.mockImplementation(async (cb: any) =>
        cb({
          update: async (...args: any[]) => updateCalls.push(args),
          create: (Entity: any, data: any) => data,
          save: async (x: any) => x,
        }),
      );

      const result = await service.create("u1", { ...baseDto, isDefault: true });

      expect(result.isDefault).toBe(true);
      expect(updateCalls).toContainEqual([CustomerAddress, { userId: "u1" }, { isDefault: false }]);
    });

    it("rejects a new address once the per-customer cap is reached", async () => {
      addressesRepo.count.mockResolvedValue(20);

      await expect(service.create("u1", { ...baseDto })).rejects.toMatchObject({ code: "ADDRESS_LIMIT_REACHED" });
      expect(addressesRepo.save).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("plain-updates fields without a transaction when not changing the default", async () => {
      addressesRepo.findOne.mockResolvedValue({ id: "a1", userId: "u1", isDefault: false, receiverName: "Old" });

      const result = await service.update("a1", "u1", { receiverName: "New" });

      expect(result.receiverName).toBe("New");
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it("unsets other defaults in a transaction when promoting this address to default", async () => {
      addressesRepo.findOne.mockResolvedValue({ id: "a1", userId: "u1", isDefault: false });
      const updateCalls: any[] = [];
      dataSource.transaction.mockImplementation(async (cb: any) =>
        cb({ update: async (...args: any[]) => updateCalls.push(args), save: async (x: any) => x }),
      );

      const result = await service.update("a1", "u1", { isDefault: true });

      expect(result.isDefault).toBe(true);
      expect(updateCalls).toContainEqual([CustomerAddress, { userId: "u1" }, { isDefault: false }]);
    });

    it("404s when the address doesn't belong to this customer", async () => {
      addressesRepo.findOne.mockResolvedValue(null);

      await expect(service.update("a1", "u1", { receiverName: "New" })).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("setDefault", () => {
    it("is a no-op when the address is already the default", async () => {
      addressesRepo.findOne.mockResolvedValue({ id: "a1", userId: "u1", isDefault: true });

      await service.setDefault("a1", "u1");

      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it("unsets the old default and sets the new one in a transaction", async () => {
      addressesRepo.findOne.mockResolvedValue({ id: "a1", userId: "u1", isDefault: false });
      const updateCalls: any[] = [];
      dataSource.transaction.mockImplementation(async (cb: any) => cb({ update: async (...args: any[]) => updateCalls.push(args) }));

      const result = await service.setDefault("a1", "u1");

      expect(result.isDefault).toBe(true);
      expect(updateCalls).toContainEqual([CustomerAddress, { userId: "u1" }, { isDefault: false }]);
      expect(updateCalls).toContainEqual([CustomerAddress, { id: "a1", userId: "u1" }, { isDefault: true }]);
    });
  });

  describe("remove", () => {
    it("just deletes a non-default address, no transaction needed", async () => {
      const address = { id: "a1", userId: "u1", isDefault: false };
      addressesRepo.findOne.mockResolvedValue(address);

      await service.remove("a1", "u1");

      expect(addressesRepo.remove).toHaveBeenCalledWith(address);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it("auto-promotes the oldest remaining address when the default is deleted", async () => {
      const address = { id: "a1", userId: "u1", isDefault: true };
      addressesRepo.findOne.mockResolvedValue(address);
      const updateCalls: any[] = [];
      dataSource.transaction.mockImplementation(async (cb: any) =>
        cb({
          remove: jest.fn(),
          find: async () => [{ id: "a2" }],
          update: async (...args: any[]) => updateCalls.push(args),
        }),
      );

      await service.remove("a1", "u1");

      expect(updateCalls).toContainEqual([CustomerAddress, { id: "a2" }, { isDefault: true }]);
    });

    it("leaves no default when the deleted default was the customer's only address", async () => {
      const address = { id: "a1", userId: "u1", isDefault: true };
      addressesRepo.findOne.mockResolvedValue(address);
      const updateCalls: any[] = [];
      dataSource.transaction.mockImplementation(async (cb: any) =>
        cb({ remove: jest.fn(), find: async () => [], update: async (...args: any[]) => updateCalls.push(args) }),
      );

      await service.remove("a1", "u1");

      expect(updateCalls).toHaveLength(0);
    });
  });
});
