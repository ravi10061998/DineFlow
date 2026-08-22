import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { CouponsService } from "./coupons.service";
import { CreateCouponDto } from "./dto/create-coupon.dto";
import { UpdateCouponDto } from "./dto/update-coupon.dto";

@ApiTags("Admin - Coupons")
@Controller("admin/coupons")
export class AdminCouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get()
  @RequirePermissions("coupons:read")
  async list() {
    return { message: "Coupons fetched", data: await this.couponsService.findAllForAdmin() };
  }

  @Get(":id/redemptions")
  @RequirePermissions("coupons:read")
  async redemptions(@Param("id", ParseUUIDPipe) id: string) {
    return { message: "Redemptions fetched", data: await this.couponsService.findRedemptionsForAdmin(id) };
  }

  @Post()
  @RequirePermissions("coupons:manage")
  async create(@Body() dto: CreateCouponDto) {
    return { message: "Coupon created", data: await this.couponsService.create(dto) };
  }

  @Patch(":id")
  @RequirePermissions("coupons:manage")
  async update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateCouponDto) {
    return { message: "Coupon updated", data: await this.couponsService.update(id, dto) };
  }

  @Delete(":id")
  @RequirePermissions("coupons:manage")
  async remove(@Param("id", ParseUUIDPipe) id: string) {
    await this.couponsService.remove(id);
    return { message: "Coupon deleted", data: null };
  }
}
