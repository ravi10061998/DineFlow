import { Body, Controller, Post, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Request } from "express";
import { Public } from "../../common/decorators/public.decorator";
import { RestaurantsService } from "./restaurants.service";
import { AuthService } from "../auth/auth.service";
import { RegisterRestaurantDto } from "./dto/register-restaurant.dto";
import * as crypto from "crypto";

@ApiTags("Restaurant Registration")
@Controller("restaurants")
export class RestaurantRegistrationController {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly authService: AuthService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("register")
  async register(@Body() dto: RegisterRestaurantDto, @Req() req: Request) {
    const { restaurant, user } = await this.restaurantsService.register(dto);
    const tokens = await this.authService.issueTokenPair(user, crypto.randomUUID(), {
      userAgent: req.headers["user-agent"] ?? null,
      ipAddress: req.ip ?? null,
    });
    return {
      message: "Restaurant registered — pending admin approval",
      data: {
        restaurant: { id: restaurant.id, name: restaurant.name, slug: restaurant.slug, status: restaurant.status },
        user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role.name },
        ...tokens,
      },
    };
  }
}
