import { Type } from "class-transformer";
import { IsArray, IsEnum, IsNumber, IsObject, IsOptional, IsString, Min, MinLength } from "class-validator";
import { BillingInterval, CommissionType } from "../entities/subscription-plan.entity";

export class CreatePlanDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(BillingInterval)
  billingInterval!: BillingInterval;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsEnum(CommissionType)
  commissionType!: CommissionType;

  @IsNumber()
  @Min(0)
  commissionValue!: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @IsOptional()
  @IsObject()
  limits?: Record<string, number>;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sortOrder?: number;
}
