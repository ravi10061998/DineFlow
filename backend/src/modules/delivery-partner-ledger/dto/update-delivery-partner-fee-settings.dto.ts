import { IsNumber, Min } from "class-validator";

export class UpdateDeliveryPartnerFeeSettingsDto {
  @IsNumber()
  @Min(0)
  perDeliveryRate!: number;
}
