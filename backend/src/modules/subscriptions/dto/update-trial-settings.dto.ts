import { ArrayMinSize, IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, Min } from "class-validator";
import { CommissionType } from "../../../common/enums/commission-type.enum";

export class UpdateTrialSettingsDto {
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  trialDurationDays?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  reminderScheduleDays?: number[];

  @IsOptional()
  @IsEnum(CommissionType)
  trialCommissionType?: CommissionType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  trialCommissionValue?: number;
}
