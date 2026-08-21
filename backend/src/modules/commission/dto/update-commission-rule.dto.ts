import { IsBoolean, IsDateString, IsOptional, IsString, MinLength } from "class-validator";

/** Edits to an existing rule — commissionType/Value/restaurantId are immutable; create a new rule instead. */
export class UpdateCommissionRuleDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  reason?: string;

  @IsOptional()
  @IsDateString()
  validTo?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
