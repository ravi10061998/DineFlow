import { Body, Controller, Delete, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { CustomerGuard } from "../customers/guards/customer.guard";
import { PushTokensService } from "./push-tokens.service";
import { RegisterPushTokenDto } from "./dto/register-push-token.dto";

@ApiTags("Customer Self-Service - Push Tokens")
@UseGuards(CustomerGuard)
@Controller("customer/me/push-token")
export class CustomerPushTokensController {
  constructor(private readonly pushTokensService: PushTokensService) {}

  @Post()
  async register(@CurrentUser() user: AuthenticatedUser, @Body() dto: RegisterPushTokenDto) {
    const token = await this.pushTokensService.register(user.userId, dto.token, dto.platform);
    return { message: "Push token registered", data: token };
  }

  @Delete()
  async unregister(@CurrentUser() user: AuthenticatedUser, @Body() dto: RegisterPushTokenDto) {
    await this.pushTokensService.unregister(user.userId, dto.token);
    return { message: "Push token unregistered", data: null };
  }
}
