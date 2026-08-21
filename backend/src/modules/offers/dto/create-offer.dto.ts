import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from "class-validator";
import { CommissionType } from "../../../common/enums/commission-type.enum";

export class CreateOfferDto {
  @IsString()
  @MinLength(3)
  code!: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(CommissionType)
  discountType!: CommissionType;

  @IsNumber()
  @Min(0)
  discountValue!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsUUID()
  restaurantId?: string;
}
