import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditLog } from "./entities/audit-log.entity";
import { AuditLogsService } from "./audit-logs.service";
import { AdminAuditLogsController } from "./admin-audit-logs.controller";

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AdminAuditLogsController],
  providers: [AuditLogsService],
  // Exported so AppModule's global AuditLogInterceptor (registered as APP_INTERCEPTOR alongside
  // this module import, not inside it) can have AuditLogsService injected into it.
  exports: [AuditLogsService],
})
export class AuditLogsModule {}
