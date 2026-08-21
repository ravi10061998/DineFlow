import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { RolesService } from "./roles.service";
import { Role } from "./entities/role.entity";
import { Permission } from "./entities/permission.entity";
import { UsersService } from "../users/users.service";

describe("RolesService", () => {
  let rolesService: RolesService;
  let rolesRepo: { findOne: jest.Mock; save: jest.Mock; remove: jest.Mock };
  let usersService: { countByRoleId: jest.Mock };

  beforeEach(async () => {
    rolesRepo = { findOne: jest.fn(), save: jest.fn((x) => x), remove: jest.fn() };
    usersService = { countByRoleId: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: getRepositoryToken(Role), useValue: rolesRepo },
        { provide: getRepositoryToken(Permission), useValue: { find: jest.fn() } },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    rolesService = moduleRef.get(RolesService);
  });

  it("refuses to delete a system role", async () => {
    rolesRepo.findOne.mockResolvedValue({ id: "role-1", isSystem: true, name: "ADMIN" });

    await expect(rolesService.remove("role-1")).rejects.toMatchObject({ code: "SYSTEM_ROLE_PROTECTED" });
    expect(usersService.countByRoleId).not.toHaveBeenCalled();
  });

  it("refuses to delete a role still assigned to users", async () => {
    rolesRepo.findOne.mockResolvedValue({ id: "role-2", isSystem: false, name: "CUSTOM" });
    usersService.countByRoleId.mockResolvedValue(3);

    await expect(rolesService.remove("role-2")).rejects.toMatchObject({ code: "ROLE_IN_USE" });
    expect(rolesRepo.remove).not.toHaveBeenCalled();
  });

  it("deletes a custom role with no assigned users", async () => {
    const role = { id: "role-3", isSystem: false, name: "CUSTOM" };
    rolesRepo.findOne.mockResolvedValue(role);
    usersService.countByRoleId.mockResolvedValue(0);

    await rolesService.remove("role-3");

    expect(rolesRepo.remove).toHaveBeenCalledWith(role);
  });

  it("refuses to update a system role", async () => {
    rolesRepo.findOne.mockResolvedValue({ id: "role-1", isSystem: true, name: "ADMIN" });

    await expect(rolesService.update("role-1", { description: "hacked" })).rejects.toMatchObject({
      code: "SYSTEM_ROLE_PROTECTED",
    });
  });
});
