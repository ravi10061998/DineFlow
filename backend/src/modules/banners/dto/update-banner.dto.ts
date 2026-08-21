import { PartialType } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";
import { CreateBannerDto } from "./create-banner.dto";

export class UpdateBannerDto extends PartialType(CreateBannerDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
