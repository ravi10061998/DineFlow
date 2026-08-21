import { IsBoolean, IsUUID } from "class-validator";

/** Dev/demo-only DTO — see MockPaymentGateway's docblock. Delete alongside the mock-complete route. */
export class MockCompleteDto {
  @IsUUID()
  paymentId!: string;

  @IsBoolean()
  succeed!: boolean;
}
