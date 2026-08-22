import { IsString, Length } from "class-validator";

export class DeliverDto {
  @IsString()
  @Length(6, 6)
  otp!: string;
}
