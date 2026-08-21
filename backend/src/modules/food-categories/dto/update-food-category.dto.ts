import { PartialType } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";
import { CreateFoodCategoryDto } from "./create-food-category.dto";

export class UpdateFoodCategoryDto extends PartialType(CreateFoodCategoryDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
