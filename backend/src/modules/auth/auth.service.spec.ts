import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { getRepositoryToken } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import { DataSource } from "typeorm";
import { AuthService } from "./auth.service";
import { UsersService } from "../users/users.service";
import { RolesService } from "../roles/roles.service";
import { RefreshToken } from "./entities/refresh-token.entity";
import { VerificationToken } from "./entities/verification-token.entity";
import { User, UserStatus } from "../users/entities/user.entity";
import { BusinessException } from "../../common/exceptions/business.exception";

describe("AuthService", () => {
  let authService: AuthService;
  let usersService: jest.Mocked<Pick<UsersService, "findByEmail" | "touchLastLogin" | "create" | "findById">>;
  let refreshTokensRepo: { save: jest.Mock; create: jest.Mock; update: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  const baseUser = (overrides: Partial<User> = {}): User =>
    ({
      id: "user-1",
      email: "customer@example.com",
      passwordHash: "",
      status: UserStatus.ACTIVE,
      roleId: "role-customer",
      role: { id: "role-customer", name: "CUSTOMER", permissions: [] } as any,
      restaurantId: null,
      ...overrides,
    }) as User;

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      touchLastLogin: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
    };
    refreshTokensRepo = { save: jest.fn((x) => x), create: jest.fn((x) => x), update: jest.fn() };
    dataSource = { transaction: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: RolesService, useValue: { findByName: jest.fn() } },
        { provide: JwtService, useValue: { sign: jest.fn(() => "signed.jwt.token") } },
        { provide: ConfigService, useValue: { get: jest.fn((key: string) => (key === "JWT_ACCESS_EXPIRES_IN" ? "15m" : "secret")) } },
        { provide: DataSource, useValue: dataSource },
        { provide: getRepositoryToken(RefreshToken), useValue: refreshTokensRepo },
        { provide: getRepositoryToken(VerificationToken), useValue: { create: jest.fn((x) => x), save: jest.fn(), findOne: jest.fn() } },
      ],
    }).compile();

    authService = moduleRef.get(AuthService);
  });

  describe("login", () => {
    it("issues a token pair on correct credentials", async () => {
      const passwordHash = await bcrypt.hash("correct-password", 4);
      usersService.findByEmail.mockResolvedValue(baseUser({ passwordHash }));

      const result = await authService.login(
        { email: "customer@example.com", password: "correct-password" },
        { userAgent: null, ipAddress: null },
      );

      expect(result.tokens.accessToken).toBe("signed.jwt.token");
      expect(result.tokens.refreshToken).toHaveLength(64); // 32 random bytes, hex-encoded
      expect(usersService.touchLastLogin).toHaveBeenCalledWith("user-1");
    });

    it("rejects an incorrect password without revealing which field was wrong", async () => {
      const passwordHash = await bcrypt.hash("correct-password", 4);
      usersService.findByEmail.mockResolvedValue(baseUser({ passwordHash }));

      await expect(
        authService.login({ email: "customer@example.com", password: "wrong" }, { userAgent: null, ipAddress: null }),
      ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" } satisfies Partial<BusinessException>);
    });

    it("rejects a suspended account before checking the password", async () => {
      usersService.findByEmail.mockResolvedValue(baseUser({ status: UserStatus.SUSPENDED, passwordHash: "irrelevant" }));

      await expect(
        authService.login({ email: "customer@example.com", password: "anything" }, { userAgent: null, ipAddress: null }),
      ).rejects.toMatchObject({ code: "ACCOUNT_SUSPENDED" });
    });

    it("rejects an unknown email with the same generic error as a wrong password", async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login({ email: "nobody@example.com", password: "anything" }, { userAgent: null, ipAddress: null }),
      ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    });
  });

  describe("refresh", () => {
    it("revokes the entire token family when a revoked token is reused", async () => {
      const manager = {
        findOne: jest.fn().mockResolvedValue({
          id: "rt-1",
          familyId: "family-1",
          tokenHash: "hash",
          revokedAt: new Date(), // already revoked -> reuse/theft signal
          expiresAt: new Date(Date.now() + 60_000),
          userId: "user-1",
        }),
        update: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
      };
      dataSource.transaction.mockImplementation((cb: any) => cb(manager));

      await expect(authService.refresh("some-raw-token", { userAgent: null, ipAddress: null })).rejects.toMatchObject({
        code: "INVALID_REFRESH_TOKEN",
      });

      expect(manager.update).toHaveBeenCalledWith(
        RefreshToken,
        { familyId: "family-1", revokedAt: null },
        { revokedAt: expect.any(Date) },
      );
    });
  });
});
