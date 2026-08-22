import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { RefreshToken } from "./entities/refresh-token.entity";
import { VerificationToken } from "./entities/verification-token.entity";
import { UsersModule } from "../users/users.module";
import { RolesModule } from "../roles/roles.module";
import { NotificationGatewayModule } from "../notification-gateway/notification-gateway.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([RefreshToken, VerificationToken]),
    PassportModule,
    JwtModule.register({}), // secret/expiry passed explicitly per sign() call in AuthService
    UsersModule,
    RolesModule,
    NotificationGatewayModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
