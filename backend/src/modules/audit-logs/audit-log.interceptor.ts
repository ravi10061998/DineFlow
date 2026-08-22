import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { AuditLogsService } from "./audit-logs.service";
import { AuthenticatedUser } from "../../common/decorators/current-user.decorator";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Global — bound in `AppModule` alongside `ResponseInterceptor`. Records
 * every authenticated mutating request platform-wide, regardless of which
 * module it hit — distinct from the domain-specific history tables
 * (restaurant_status_history, order_status_history, etc.), which record one
 * entity's own lifecycle rather than "who did this, from where, when."
 * `/auth/*` is excluded entirely: login/register/refresh/reset-password are
 * authentication plumbing, not business actions, and carry the highest risk
 * of a redaction gap leaking a credential — not worth the audit value here.
 * Writing the log itself can never fail or slow down the real request:
 * `AuditLogsService.record()` is fire-and-forget by its own design.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;
    const method: string = request.method;
    const path: string = request.route?.path ?? request.path ?? request.url;

    if (!user || !MUTATING_METHODS.has(method) || path.startsWith("/auth")) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: () => {
          void this.auditLogsService.record({
            actorUserId: user.userId,
            actorEmail: user.email,
            actorRole: user.roleName,
            method,
            path,
            success: true,
            ipAddress: request.ip ?? null,
            body: request.body,
          });
        },
        error: (err: unknown) => {
          void this.auditLogsService.record({
            actorUserId: user.userId,
            actorEmail: user.email,
            actorRole: user.roleName,
            method,
            path,
            success: false,
            errorMessage: err instanceof Error ? err.message : String(err),
            ipAddress: request.ip ?? null,
            body: request.body,
          });
        },
      }),
    );
  }
}
