import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { AuditLogsService } from "./audit-logs.service";
import { AuditLog } from "./entities/audit-log.entity";

describe("AuditLogsService", () => {
  let service: AuditLogsService;
  let repo: { create: jest.Mock; save: jest.Mock; createQueryBuilder: jest.Mock };
  let qb: { andWhere: jest.Mock; orderBy: jest.Mock; limit: jest.Mock; getMany: jest.Mock };

  beforeEach(async () => {
    qb = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    repo = { create: jest.fn((x) => x), save: jest.fn(async (x) => x), createQueryBuilder: jest.fn().mockReturnValue(qb) };

    const moduleRef = await Test.createTestingModule({
      providers: [AuditLogsService, { provide: getRepositoryToken(AuditLog), useValue: repo }],
    }).compile();

    service = moduleRef.get(AuditLogsService);
  });

  describe("record", () => {
    it("redacts a password field before saving", async () => {
      await service.record({
        actorUserId: "u1",
        actorEmail: "admin@dineflow.local",
        actorRole: "ADMIN",
        method: "POST",
        path: "/admin/coupons",
        success: true,
        body: { code: "DINE50", password: "supersecret" },
      });

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: { code: "DINE50", password: "[REDACTED]" } }),
      );
    });

    it("redacts a refreshToken field too, not just password", async () => {
      await service.record({
        actorUserId: "u1",
        actorEmail: "admin@dineflow.local",
        actorRole: "ADMIN",
        method: "POST",
        path: "/auth/refresh",
        success: true,
        body: { refreshToken: "abc123" },
      });

      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ metadata: { refreshToken: "[REDACTED]" } }));
    });

    it("stores null metadata when no body is given", async () => {
      await service.record({ actorUserId: "u1", actorEmail: "a@b.com", actorRole: "ADMIN", method: "DELETE", path: "/admin/reviews/1", success: true });

      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ metadata: null }));
    });

    it("swallows a repository failure rather than throwing it back at the caller", async () => {
      repo.save.mockRejectedValue(new Error("db down"));

      await expect(
        service.record({ actorUserId: "u1", actorEmail: "a@b.com", actorRole: "ADMIN", method: "POST", path: "/admin/coupons", success: true }),
      ).resolves.toBeUndefined();
    });

    it("records a failure outcome with the error message", async () => {
      await service.record({
        actorUserId: "u1",
        actorEmail: "a@b.com",
        actorRole: "ADMIN",
        method: "DELETE",
        path: "/admin/reviews/1",
        success: false,
        errorMessage: "Review not found",
      });

      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ success: false, errorMessage: "Review not found" }));
    });
  });

  describe("findAllForAdmin", () => {
    it("applies actorUserId/method/path filters when given", async () => {
      await service.findAllForAdmin({ actorUserId: "u1", method: "delete", path: "/coupons" });

      expect(qb.andWhere).toHaveBeenCalledWith(expect.stringContaining("actor_user_id"), { actorUserId: "u1" });
      expect(qb.andWhere).toHaveBeenCalledWith(expect.stringContaining("method"), { method: "DELETE" });
      expect(qb.andWhere).toHaveBeenCalledWith(expect.stringContaining("path"), { path: "%/coupons%" });
    });

    it("applies no filters when none are given", async () => {
      await service.findAllForAdmin({});

      expect(qb.andWhere).not.toHaveBeenCalled();
    });
  });
});
