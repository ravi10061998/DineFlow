import { Body, Controller, Get, Param, ParseUUIDPipe, Patch } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { UsersService } from "./users.service";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";
import { AssignUserRoleDto } from "./dto/assign-user-role.dto";

@ApiTags("Admin - Users")
@Controller("admin/users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions("users:read")
  async list() {
    const users = await this.usersService.list();
    return { message: "Users fetched", data: users.map((u) => this.toPublic(u)) };
  }

  @Get(":id")
  @RequirePermissions("users:read")
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    const user = await this.usersService.findById(id);
    return { message: "User fetched", data: this.toPublic(user) };
  }

  @Patch(":id/status")
  @RequirePermissions("users:manage")
  async updateStatus(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateUserStatusDto) {
    const user = await this.usersService.updateStatus(id, dto.status);
    return { message: "User status updated", data: this.toPublic(user) };
  }

  @Patch(":id/role")
  @RequirePermissions("users:manage")
  async updateRole(@Param("id", ParseUUIDPipe) id: string, @Body() dto: AssignUserRoleDto) {
    const user = await this.usersService.updateRole(id, dto.roleId);
    return { message: "User role updated", data: this.toPublic(user) };
  }

  // Never serialize passwordHash — it's excluded at the query level (select: false)
  // but this keeps the response shape explicit and stable for API consumers.
  private toPublic(user: {
    id: string;
    email: string;
    phone: string | null;
    fullName: string;
    status: string;
    role: unknown;
    restaurantId: string | null;
    emailVerifiedAt: Date | null;
    lastLoginAt: Date | null;
    createdAt: Date;
  }) {
    const { id, email, phone, fullName, status, role, restaurantId, emailVerifiedAt, lastLoginAt, createdAt } = user;
    return { id, email, phone, fullName, status, role, restaurantId, emailVerifiedAt, lastLoginAt, createdAt };
  }
}
