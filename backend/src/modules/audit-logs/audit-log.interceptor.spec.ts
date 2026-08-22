import { of, throwError, firstValueFrom } from "rxjs";
import { AuditLogInterceptor } from "./audit-log.interceptor";
import { AuditLogsService } from "./audit-logs.service";

function makeContext(overrides: Record<string, unknown> = {}) {
  const request = {
    method: "POST",
    path: "/admin/coupons",
    url: "/admin/coupons",
    route: { path: "/admin/coupons" },
    ip: "127.0.0.1",
    body: { code: "DINE50" },
    user: { userId: "u1", email: "admin@dineflow.local", roleName: "ADMIN", permissions: [], restaurantId: null },
    ...overrides,
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as any;
}

describe("AuditLogInterceptor", () => {
  let interceptor: AuditLogInterceptor;
  let auditLogsService: { record: jest.Mock };

  beforeEach(() => {
    auditLogsService = { record: jest.fn().mockResolvedValue(undefined) };
    interceptor = new AuditLogInterceptor(auditLogsService as unknown as AuditLogsService);
  });

  it("records a successful mutating request with the authenticated actor's identity", async () => {
    const next = { handle: () => of({ ok: true }) };

    await firstValueFrom(interceptor.intercept(makeContext(), next as any));

    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: "u1", actorEmail: "admin@dineflow.local", actorRole: "ADMIN", method: "POST", path: "/admin/coupons", success: true }),
    );
  });

  it("records a failed request with the error message, without swallowing the error from the caller's perspective", async () => {
    const next = { handle: () => throwError(() => new Error("Coupon not found")) };

    await expect(firstValueFrom(interceptor.intercept(makeContext(), next as any))).rejects.toThrow("Coupon not found");

    expect(auditLogsService.record).toHaveBeenCalledWith(expect.objectContaining({ success: false, errorMessage: "Coupon not found" }));
  });

  it("skips entirely for an unauthenticated request", async () => {
    const next = { handle: () => of({ ok: true }) };

    await firstValueFrom(interceptor.intercept(makeContext({ user: undefined }), next as any));

    expect(auditLogsService.record).not.toHaveBeenCalled();
  });

  it("skips GET requests — only mutating methods are audited", async () => {
    const next = { handle: () => of({ ok: true }) };

    await firstValueFrom(interceptor.intercept(makeContext({ method: "GET" }), next as any));

    expect(auditLogsService.record).not.toHaveBeenCalled();
  });

  it("skips /auth/* routes entirely, even authenticated mutating ones", async () => {
    const next = { handle: () => of({ ok: true }) };

    await firstValueFrom(interceptor.intercept(makeContext({ path: "/auth/logout", route: { path: "/auth/logout" } }), next as any));

    expect(auditLogsService.record).not.toHaveBeenCalled();
  });
});
