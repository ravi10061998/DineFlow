import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import * as crypto from "crypto";
import { DataSource, IsNull, LessThan, Repository } from "typeorm";
import { UsersService } from "../users/users.service";
import { RolesService } from "../roles/roles.service";
import { SystemRoleName } from "../roles/entities/role.entity";
import { User, UserStatus } from "../users/entities/user.entity";
import { RefreshToken } from "./entities/refresh-token.entity";
import { VerificationToken, VerificationTokenType } from "./entities/verification-token.entity";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { AuthErrors, SystemErrors } from "../../common/exceptions/business.exception";
import { AccessTokenPayload } from "./strategies/jwt.strategy";
import { comparePassword, hashPassword } from "../../common/utils/password.util";

const REFRESH_TOKEN_TTL_DAYS = 30;
const EMAIL_VERIFICATION_TTL_HOURS = 24;
const PASSWORD_RESET_TTL_MINUTES = 30;

export interface RequestMeta {
  userAgent: string | null;
  ipAddress: string | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    @InjectRepository(RefreshToken) private readonly refreshTokensRepository: Repository<RefreshToken>,
    @InjectRepository(VerificationToken) private readonly verificationTokensRepository: Repository<VerificationToken>,
  ) {}

  private hashToken(rawToken: string): string {
    return crypto.createHash("sha256").update(rawToken).digest("hex");
  }

  private generateRawToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  private buildAccessTokenPayload(user: User): AccessTokenPayload {
    return {
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
      roleName: user.role.name,
      permissions: (user.role.permissions ?? []).map((p) => p.key),
      restaurantId: user.restaurantId,
    };
  }

  private signAccessToken(user: User): string {
    return this.jwtService.sign(this.buildAccessTokenPayload(user), {
      secret: this.configService.get<string>("JWT_ACCESS_SECRET"),
      // @nestjs/jwt's expiresIn type only accepts its own template-literal string
      // union or a number of seconds; ConfigService can't express that statically.
      expiresIn: (this.configService.get<string>("JWT_ACCESS_EXPIRES_IN") ?? "15m") as unknown as number,
    });
  }

  /** Public so other modules (e.g. restaurant registration) can auto-login a freshly created user the same way. */
  async issueTokenPair(user: User, familyId: string, meta: RequestMeta): Promise<TokenPair> {
    const accessToken = this.signAccessToken(user);

    const rawRefreshToken = this.generateRawToken();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

    const refreshTokenEntity = this.refreshTokensRepository.create({
      userId: user.id,
      tokenHash: this.hashToken(rawRefreshToken),
      familyId,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
      expiresAt,
    });
    await this.refreshTokensRepository.save(refreshTokenEntity);

    return { accessToken, refreshToken: rawRefreshToken };
  }

  async register(dto: RegisterDto): Promise<{ user: User; tokens: TokenPair }> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw AuthErrors.emailAlreadyRegistered();
    }

    const customerRole = await this.rolesService.findByName(SystemRoleName.CUSTOMER);
    if (!customerRole) {
      throw SystemErrors.roleNotSeeded(SystemRoleName.CUSTOMER);
    }

    const passwordHash = await hashPassword(dto.password);
    const user = await this.usersService.create({
      email: dto.email,
      phone: dto.phone ?? null,
      passwordHash,
      fullName: dto.fullName,
      roleId: customerRole.id,
      status: UserStatus.ACTIVE,
    });
    user.role = customerRole;

    await this.requestEmailVerification(user.id);

    const tokens = await this.issueTokenPair(user, crypto.randomUUID(), { userAgent: null, ipAddress: null });
    return { user, tokens };
  }

  async login(dto: LoginDto, meta: RequestMeta): Promise<{ user: User; tokens: TokenPair }> {
    const user = await this.usersService.findByEmail(dto.email, true);
    if (!user) {
      throw AuthErrors.invalidCredentials();
    }
    if (user.status === UserStatus.SUSPENDED) {
      throw AuthErrors.accountSuspended();
    }
    if (user.status === UserStatus.INACTIVE) {
      throw AuthErrors.accountInactive();
    }

    const passwordMatches = await comparePassword(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw AuthErrors.invalidCredentials();
    }

    await this.usersService.touchLastLogin(user.id);
    const tokens = await this.issueTokenPair(user, crypto.randomUUID(), meta);
    return { user, tokens };
  }

  /**
   * Rotates a refresh token. If the presented token was already revoked,
   * the entire token family is revoked (possible theft/replay) and the
   * caller is forced to log in again.
   */
  async refresh(rawRefreshToken: string, meta: RequestMeta): Promise<TokenPair> {
    const tokenHash = this.hashToken(rawRefreshToken);

    return this.dataSource.transaction(async (manager) => {
      const existing = await manager.findOne(RefreshToken, { where: { tokenHash } });
      if (!existing) {
        throw AuthErrors.invalidRefreshToken();
      }

      if (existing.revokedAt || existing.expiresAt < new Date()) {
        // Reuse of an already-rotated/expired token: kill the whole family.
        await manager.update(RefreshToken, { familyId: existing.familyId, revokedAt: null }, { revokedAt: new Date() });
        throw AuthErrors.invalidRefreshToken();
      }

      await manager.update(RefreshToken, { id: existing.id }, { revokedAt: new Date() });

      const user = await this.usersService.findById(existing.userId);
      if (user.status !== UserStatus.ACTIVE) {
        throw AuthErrors.accountSuspended();
      }

      const accessToken = this.signAccessToken(user);

      const rawNewRefreshToken = this.generateRawToken();
      const newToken = manager.create(RefreshToken, {
        userId: user.id,
        tokenHash: this.hashToken(rawNewRefreshToken),
        familyId: existing.familyId,
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
      });
      await manager.save(newToken);

      return { accessToken, refreshToken: rawNewRefreshToken };
    });
  }

  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawRefreshToken);
    await this.refreshTokensRepository.update({ tokenHash, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  async logoutAll(userId: string): Promise<void> {
    await this.refreshTokensRepository.update({ userId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  async requestEmailVerification(userId: string): Promise<void> {
    const rawToken = this.generateRawToken();
    const verificationToken = this.verificationTokensRepository.create({
      userId,
      type: VerificationTokenType.EMAIL_VERIFICATION,
      tokenHash: this.hashToken(rawToken),
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_HOURS * 60 * 60 * 1000),
    });
    await this.verificationTokensRepository.save(verificationToken);
    // Notifications module (§29) isn't built yet — log so the flow is testable end-to-end.
    console.log(`[email-verification] user=${userId} token=${rawToken}`);
  }

  async confirmEmailVerification(rawToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    const record = await this.verificationTokensRepository.findOne({
      where: { tokenHash, type: VerificationTokenType.EMAIL_VERIFICATION },
    });
    if (!record || record.usedAt) {
      throw record?.usedAt ? AuthErrors.tokenAlreadyUsed() : AuthErrors.tokenInvalidOrExpired();
    }
    if (record.expiresAt < new Date()) {
      throw AuthErrors.tokenInvalidOrExpired();
    }
    await this.verificationTokensRepository.update(record.id, { usedAt: new Date() });
    await this.usersService.markEmailVerified(record.userId);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return; // Don't reveal whether the email exists.
    }
    const rawToken = this.generateRawToken();
    const resetToken = this.verificationTokensRepository.create({
      userId: user.id,
      type: VerificationTokenType.PASSWORD_RESET,
      tokenHash: this.hashToken(rawToken),
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000),
    });
    await this.verificationTokensRepository.save(resetToken);
    console.log(`[password-reset] user=${user.id} token=${rawToken}`);
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    const record = await this.verificationTokensRepository.findOne({
      where: { tokenHash, type: VerificationTokenType.PASSWORD_RESET },
    });
    if (!record || record.usedAt) {
      throw record?.usedAt ? AuthErrors.tokenAlreadyUsed() : AuthErrors.tokenInvalidOrExpired();
    }
    if (record.expiresAt < new Date()) {
      throw AuthErrors.tokenInvalidOrExpired();
    }
    await this.verificationTokensRepository.update(record.id, { usedAt: new Date() });
    const passwordHash = await hashPassword(newPassword);
    await this.usersService.updatePassword(record.userId, passwordHash);
    // A password reset is a strong signal of compromise risk — kill every existing session.
    await this.logoutAll(record.userId);
  }

  async getMe(userId: string): Promise<User> {
    return this.usersService.findById(userId);
  }

  /** Used by the trial/subscription/notification jobs later — kept here since it's token cleanup, not business logic. */
  async purgeExpiredTokens(): Promise<void> {
    const now = new Date();
    await this.refreshTokensRepository.delete({ expiresAt: LessThan(now) });
    await this.verificationTokensRepository.delete({ expiresAt: LessThan(now) });
  }
}
