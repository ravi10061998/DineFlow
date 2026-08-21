import { PartialType } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";
import { CreateAddonDto } from "./create-addon.dto";

export class UpdateAddonDto extends PartialType(CreateAddonDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
