import { IsNumber, IsOptional, Min } from "class-validator";

export class UpdateDeliveryFeeSettingsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  baseFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  perKmRate?: number;

  /** Pass null explicitly to disable the free-delivery waiver. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  freeDeliveryAboveAmount?: number | null;
}
