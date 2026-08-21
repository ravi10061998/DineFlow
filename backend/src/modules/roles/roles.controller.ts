import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { RolesService } from "./roles.service";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { SyncRolePermissionsDto } from "./dto/sync-role-permissions.dto";
import { CreatePermissionDto } from "./dto/create-permission.dto";

@ApiTags("Admin - Roles & Permissions")
@Controller("admin")
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get("roles")
  @RequirePermissions("roles:read")
  async listRoles() {
    return { message: "Roles fetched", data: await this.rolesService.findAll() };
  }

  @Get("roles/:id")
  @RequirePermissions("roles:read")
  async getRole(@Param("id", ParseUUIDPipe) id: string) {
    return { message: "Role fetched", data: await this.rolesService.findById(id) };
  }

  @Post("roles")
  @RequirePermissions("roles:manage")
  async createRole(@Body() dto: CreateRoleDto) {
    return { message: "Role created", data: await this.rolesService.create(dto) };
  }

  @Patch("roles/:id")
  @RequirePermissions("roles:manage")
  async updateRole(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateRoleDto) {
    return { message: "Role updated", data: await this.rolesService.update(id, dto) };
  }

  @Delete("roles/:id")
  @RequirePermissions("roles:manage")
  async deleteRole(@Param("id", ParseUUIDPipe) id: string) {
    await this.rolesService.remove(id);
    return { message: "Role deleted", data: null };
  }

  @Post("roles/:id/permissions")
  @RequirePermissions("roles:manage")
  async syncPermissions(@Param("id", ParseUUIDPipe) id: string, @Body() dto: SyncRolePermissionsDto) {
    return { message: "Role permissions updated", data: await this.rolesService.syncPermissions(id, dto.permissionIds) };
  }

  @Get("permissions")
  @RequirePermissions("roles:read")
  async listPermissions() {
    return { message: "Permissions fetched", data: await this.rolesService.findAllPermissions() };
  }

  @Post("permissions")
  @RequirePermissions("roles:manage")
  async createPermission(@Body() dto: CreatePermissionDto) {
    return { message: "Permission created", data: await this.rolesService.createPermission(dto) };
  }
}
