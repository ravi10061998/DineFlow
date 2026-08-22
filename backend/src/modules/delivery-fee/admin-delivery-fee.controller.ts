import { Body, Controller, Get, Patch } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { DeliveryFeeService } from "./delivery-fee.service";
import { UpdateDeliveryFeeSettingsDto } from "./dto/update-delivery-fee-settings.dto";

@ApiTags("Admin - Delivery Fee Settings")
@Controller("admin/delivery-fee-settings")
export class AdminDeliveryFeeController {
  constructor(private readonly deliveryFeeService: DeliveryFeeService) {}

  @Get()
  @RequirePermissions("delivery_fee:read")
  async get() {
    return { message: "Delivery fee settings fetched", data: await this.deliveryFeeService.getSettings() };
  }

  @Patch()
  @RequirePermissions("delivery_fee:manage")
  async update(@Body() dto: UpdateDeliveryFeeSettingsDto) {
    return { message: "Delivery fee settings updated", data: await this.deliveryFeeService.updateSettings(dto) };
  }
}
