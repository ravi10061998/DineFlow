import { IsString, IsUUID, MinLength } from "class-validator";

export class VerifyPaymentDto {
  @IsUUID()
  paymentId!: string;

  @IsString()
  @MinLength(1)
  gatewayPaymentId!: string;

  @IsString()
  @MinLength(1)
  signature!: string;
}
