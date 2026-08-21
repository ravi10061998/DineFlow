import { IsInt, IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from "class-validator";

export class CreateProductDto {
  @IsUUID()
  categoryId!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  basePrice!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
