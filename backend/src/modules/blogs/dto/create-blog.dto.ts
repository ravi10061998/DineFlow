import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Matches, Min, MinLength } from "class-validator";

export class CreateBlogDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: "slug must be lowercase, alphanumeric, hyphen-separated" })
  slug!: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsString()
  @MinLength(1)
  authorName!: string;

  @IsString()
  @MinLength(1)
  excerpt!: string;

  @IsString()
  @MinLength(1)
  content!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  readingTimeMinutes?: number;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
