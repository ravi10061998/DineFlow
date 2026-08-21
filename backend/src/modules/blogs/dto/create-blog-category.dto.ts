import { IsString, Matches, MinLength } from "class-validator";

export class CreateBlogCategoryDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: "slug must be lowercase, alphanumeric, hyphen-separated" })
  slug!: string;
}
