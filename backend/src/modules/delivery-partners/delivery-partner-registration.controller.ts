import { Body, Controller, Post, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Request } from "express";
import * as crypto from "crypto";
import { Public } from "../../common/decorators/public.decorator";
import { DeliveryPartnersService } from "./delivery-partners.service";
import { AuthService } from "../auth/auth.service";
import { RegisterDeliveryPartnerDto } from "./dto/register-delivery-partner.dto";

@ApiTags("Delivery Partner Registration")
@Controller("delivery-partners")
export class DeliveryPartnerRegistrationController {
  constructor(
    private readonly partnersService: DeliveryPartnersService,
    private readonly authService: AuthService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("register")
  async register(@Body() dto: RegisterDeliveryPartnerDto, @Req() req: Request) {
    const { partner, user } = await this.partnersService.register(dto);
    const tokens = await this.authService.issueTokenPair(user, crypto.randomUUID(), {
      userAgent: req.headers["user-agent"] ?? null,
      ipAddress: req.ip ?? null,
    });
    return {
      message: "Delivery partner registered — pending admin approval",
      data: {
        partner: { id: partner.id, status: partner.status },
        user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role.name },
        ...tokens,
      },
    };
  }
}
