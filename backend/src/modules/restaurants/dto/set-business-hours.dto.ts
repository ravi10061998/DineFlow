import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsOptional, Matches, Max, Min, ValidateNested } from "class-validator";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class BusinessHoursEntryDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: "openTime must be HH:mm (24h)" })
  openTime?: string;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: "closeTime must be HH:mm (24h)" })
  closeTime?: string;

  @IsOptional()
  @IsBoolean()
  isClosed?: boolean;
}

export class SetBusinessHoursDto {
  @IsArray()
  @ArrayMaxSize(21) // up to 3 split-shift entries per day of the week
  @ValidateNested({ each: true })
  @Type(() => BusinessHoursEntryDto)
  entries!: BusinessHoursEntryDto[];
}
