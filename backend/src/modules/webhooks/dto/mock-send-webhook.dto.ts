import { IsBoolean } from "class-validator";

/** Dev/demo-only DTO — see MockWebhookController's docblock. */
export class MockSendWebhookDto {
  @IsBoolean()
  succeed!: boolean;
}
