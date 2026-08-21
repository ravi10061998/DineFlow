import { IsBoolean } from "class-validator";

export class SetFeaturedDto {
  @IsBoolean()
  isFeatured!: boolean;
}
