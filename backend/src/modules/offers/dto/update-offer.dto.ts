import { PartialType } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";
import { CreateOfferDto } from "./create-offer.dto";

export class UpdateOfferDto extends PartialType(CreateOfferDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
