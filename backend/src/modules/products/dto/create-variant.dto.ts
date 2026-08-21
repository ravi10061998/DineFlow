import { IsNumber, IsString, Min, MinLength } from "class-validator";

export class CreateVariantDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsNumber()
  @Min(0)
  price!: number;
}
