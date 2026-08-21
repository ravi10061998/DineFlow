import { IsNumber, IsString, Min, MinLength } from "class-validator";

export class CreateAddonDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsNumber()
  @Min(0)
  price!: number;
}
