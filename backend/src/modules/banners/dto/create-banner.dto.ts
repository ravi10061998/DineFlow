import { IsDateString, IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";

export class CreateBannerDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsString()
  @MinLength(1)
  imageUrl!: string;

  @IsOptional()
  @IsString()
  ctaLabel?: string;

  @IsOptional()
  @IsString()
  ctaUrl?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
