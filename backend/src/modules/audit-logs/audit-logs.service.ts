import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditLog } from "./entities/audit-log.entity";

const REDACTED_KEYS = ["password", "newPassword", "currentPassword", "token", "rawToken", "refreshToken", "accessToken", "tokenHash"];
const REDACTED = "[REDACTED]";

export interface RecordAuditLogInput {
  actorUserId: string | null;
  actorEmail: string;
  actorRole: string;
  method: string;
  path: string;
  success: boolean;
  errorMessage?: string | null;
  ipAddress?: string | null;
  body?: unknown;
}

export interface AuditLogFilters {
  actorUserId?: string;
  method?: string;
  path?: string;
  since?: Date;
}

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(@InjectRepository(AuditLog) private readonly repository: Repository<AuditLog>) {}

  /**
   * Fire-and-forget by design — an audit-log write failing must never break
   * the real request it's recording. Errors are swallowed after a log line,
   * same principle as `NotificationDispatchService` never letting a failed
   * send propagate back to its caller.
   */
  async record(input: RecordAuditLogInput): Promise<void> {
    try {
      const entry = this.repository.create({
        actorUserId: input.actorUserId,
        actorEmail: input.actorEmail,
        actorRole: input.actorRole,
        method: input.method,
        path: input.path,
        success: input.success,
        errorMessage: input.errorMessage ?? null,
        ipAddress: input.ipAddress ?? null,
        metadata: input.body ? this.redact(input.body) : null,
      });
      await this.repository.save(entry);
    } catch (err) {
      this.logger.error(`Failed to write audit log for ${input.method} ${input.path}: ${(err as Error).message}`);
    }
  }

  findAllForAdmin(filters: AuditLogFilters): Promise<AuditLog[]> {
    const qb = this.repository.createQueryBuilder("log").orderBy("log.created_at", "DESC").limit(500);
    if (filters.actorUserId) qb.andWhere("log.actor_user_id = :actorUserId", { actorUserId: filters.actorUserId });
    if (filters.method) qb.andWhere("log.method = :method", { method: filters.method.toUpperCase() });
    if (filters.path) qb.andWhere("log.path LIKE :path", { path: `%${filters.path}%` });
    if (filters.since) qb.andWhere("log.created_at >= :since", { since: filters.since });
    return qb.getMany();
  }

  /** Shallow redaction — every DTO in this app is a flat object, so one level is enough; never logs a raw password/token. */
  private redact(body: unknown): Record<string, unknown> | null {
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
      result[key] = REDACTED_KEYS.includes(key) ? REDACTED : value;
    }
    return result;
  }
}
