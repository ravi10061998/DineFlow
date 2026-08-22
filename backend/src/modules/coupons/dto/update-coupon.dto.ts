import { PartialType } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";
import { CreateCouponDto } from "./create-coupon.dto";

export class UpdateCouponDto extends PartialType(CreateCouponDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
