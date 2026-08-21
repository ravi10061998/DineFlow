import { IsNumber, Min } from "class-validator";

export class CalculatePreviewDto {
  @IsNumber()
  @Min(0.01)
  amount!: number;
}
