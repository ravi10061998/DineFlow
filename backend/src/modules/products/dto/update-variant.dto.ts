import { PartialType } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";
import { CreateVariantDto } from "./create-variant.dto";

export class UpdateVariantDto extends PartialType(CreateVariantDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
