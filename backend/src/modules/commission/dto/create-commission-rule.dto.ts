import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from "class-validator";
import { CommissionType } from "../../../common/enums/commission-type.enum";

export class CreateCommissionRuleDto {
  @IsUUID()
  restaurantId!: string;

  @IsEnum(CommissionType)
  commissionType!: CommissionType;

  @IsNumber()
  @Min(0)
  commissionValue!: number;

  @IsString()
  @MinLength(3)
  reason!: string;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validTo?: string;
}
