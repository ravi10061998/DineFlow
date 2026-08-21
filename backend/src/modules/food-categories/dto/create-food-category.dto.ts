import { IsInt, IsOptional, IsString, Matches, Min, MinLength } from "class-validator";

export class CreateFoodCategoryDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: "slug must be lowercase, alphanumeric, hyphen-separated" })
  slug!: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
