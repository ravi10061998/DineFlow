import { IsString, MaxLength, MinLength } from "class-validator";

export class RejectBankAccountDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
