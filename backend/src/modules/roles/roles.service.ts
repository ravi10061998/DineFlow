import { HttpStatus, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Role } from "./entities/role.entity";
import { Permission } from "./entities/permission.entity";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { CreatePermissionDto } from "./dto/create-permission.dto";
import { AuthErrors, BusinessException } from "../../common/exceptions/business.exception";
import { UsersService } from "../users/users.service";

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) private readonly rolesRepository: Repository<Role>,
    @InjectRepository(Permission) private readonly permissionsRepository: Repository<Permission>,
    private readonly usersService: UsersService,
  ) {}

  findAll(): Promise<Role[]> {
    return this.rolesRepository.find({ relations: { permissions: true }, order: { name: "ASC" } });
  }

  async findById(id: string): Promise<Role> {
    const role = await this.rolesRepository.findOne({ where: { id }, relations: { permissions: true } });
    if (!role) {
      throw new NotFoundException("Role not found");
    }
    return role;
  }

  findByName(name: string): Promise<Role | null> {
    return this.rolesRepository.findOne({ where: { name }, relations: { permissions: true } });
  }

  create(dto: CreateRoleDto): Promise<Role> {
    const role = this.rolesRepository.create({ ...dto, isSystem: false, permissions: [] });
    return this.rolesRepository.save(role);
  }

  async update(id: string, dto: UpdateRoleDto): Promise<Role> {
    const role = await this.findById(id);
    if (role.isSystem) {
      throw AuthErrors.systemRoleProtected();
    }
    Object.assign(role, dto);
    return this.rolesRepository.save(role);
  }

  async remove(id: string): Promise<void> {
    const role = await this.findById(id);
    if (role.isSystem) {
      throw AuthErrors.systemRoleProtected();
    }
    const usersWithRole = await this.usersService.countByRoleId(id);
    if (usersWithRole > 0) {
      throw AuthErrors.roleInUse();
    }
    await this.rolesRepository.remove(role);
  }

  async syncPermissions(id: string, permissionIds: string[]): Promise<Role> {
    const role = await this.findById(id);
    const permissions = await this.permissionsRepository.find({ where: { id: In(permissionIds) } });
    if (permissions.length !== permissionIds.length) {
      throw new BusinessException(
        "PERMISSION_NOT_FOUND",
        "One or more permission ids do not exist.",
        HttpStatus.BAD_REQUEST,
      );
    }
    role.permissions = permissions;
    return this.rolesRepository.save(role);
  }

  findAllPermissions(): Promise<Permission[]> {
    return this.permissionsRepository.find({ order: { module: "ASC", key: "ASC" } });
  }

  async createPermission(dto: CreatePermissionDto): Promise<Permission> {
    const permission = this.permissionsRepository.create(dto);
    return this.permissionsRepository.save(permission);
  }
}
