import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { DeliveryPartnerGuard } from "./guards/delivery-partner.guard";
import { DeliveryPartnersService } from "./delivery-partners.service";
import { UpdateDeliveryPartnerDto } from "./dto/update-delivery-partner.dto";
import { SetOnlineDto } from "./dto/set-online.dto";
import { UpdateLocationDto } from "./dto/update-location.dto";

@ApiTags("Delivery Partner Self-Service")
@UseGuards(DeliveryPartnerGuard)
@Controller("delivery-partner/me")
export class DeliveryPartnerSelfServiceController {
  constructor(private readonly partnersService: DeliveryPartnersService) {}

  @Get()
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    const partner = await this.partnersService.findByUserIdOrThrow(user.userId);
    return { message: "Profile fetched", data: partner };
  }

  @Patch()
  async updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateDeliveryPartnerDto) {
    const partner = await this.partnersService.updateOwnProfile(user.userId, dto);
    return { message: "Profile updated", data: partner };
  }

  @Patch("online")
  async setOnline(@CurrentUser() user: AuthenticatedUser, @Body() dto: SetOnlineDto) {
    const partner = await this.partnersService.setOnline(user.userId, dto.isOnline);
    return { message: dto.isOnline ? "You're now online" : "You're now offline", data: partner };
  }

  @Patch("location")
  async updateLocation(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateLocationDto) {
    const partner = await this.partnersService.updateLocation(user.userId, dto);
    return { message: "Location updated", data: partner };
  }
}
