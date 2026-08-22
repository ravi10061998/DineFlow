import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { AuditLogsService } from "./audit-logs.service";

@ApiTags("Admin - Audit Logs")
@Controller("admin/audit-logs")
@RequirePermissions("audit_logs:read")
export class AdminAuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  async list(@Query("actorUserId") actorUserId?: string, @Query("method") method?: string, @Query("path") path?: string) {
    return { message: "Audit logs fetched", data: await this.auditLogsService.findAllForAdmin({ actorUserId, method, path }) };
  }
}
