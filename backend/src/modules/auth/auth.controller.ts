import { Body, Controller, Post, Get, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Request } from "express";
import { Public } from "../../common/decorators/public.decorator";
import { CurrentUser, AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { VerifyEmailConfirmDto } from "./dto/verify-email-confirm.dto";
import { User } from "../users/entities/user.entity";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private requestMeta(req: Request) {
    return { userAgent: req.headers["user-agent"] ?? null, ipAddress: req.ip ?? null };
  }

  private toPublicUser(user: User) {
    const { id, email, phone, fullName, status, role, restaurantId, emailVerifiedAt } = user;
    return { id, email, phone, fullName, status, role: role?.name, restaurantId, emailVerified: Boolean(emailVerifiedAt) };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("register")
  async register(@Body() dto: RegisterDto) {
    const { user, tokens } = await this.authService.register(dto);
    return { message: "Registration successful", data: { user: this.toPublicUser(user), ...tokens } };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("login")
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const { user, tokens } = await this.authService.login(dto, this.requestMeta(req));
    return { message: "Login successful", data: { user: this.toPublicUser(user), ...tokens } };
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post("refresh")
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    const tokens = await this.authService.refresh(dto.refreshToken, this.requestMeta(req));
    return { message: "Token refreshed", data: tokens };
  }

  @Post("logout")
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.logout(dto.refreshToken);
    return { message: "Logged out", data: null };
  }

  @Post("logout-all")
  async logoutAll(@CurrentUser() user: AuthenticatedUser) {
    await this.authService.logoutAll(user.userId);
    return { message: "Logged out of all devices", data: null };
  }

  @Get("me")
  async me(@CurrentUser() user: AuthenticatedUser) {
    const fullUser = await this.authService.getMe(user.userId);
    return { message: "Current user", data: { ...this.toPublicUser(fullUser), permissions: user.permissions } };
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("verify-email/request")
  async requestEmailVerification(@CurrentUser() user: AuthenticatedUser) {
    await this.authService.requestEmailVerification(user.userId);
    return { message: "Verification email sent", data: null };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("verify-email/confirm")
  async confirmEmailVerification(@Body() dto: VerifyEmailConfirmDto) {
    await this.authService.confirmEmailVerification(dto.token);
    return { message: "Email verified", data: null };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("forgot-password")
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return { message: "If that email exists, a reset link has been sent", data: null };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("reset-password")
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: "Password reset successful", data: null };
  }
}
