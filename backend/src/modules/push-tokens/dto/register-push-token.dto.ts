import { IsEnum, IsString, MaxLength } from "class-validator";
import { PushPlatform } from "../entities/push-token.entity";

export class RegisterPushTokenDto {
  @IsString()
  @MaxLength(255)
  token!: string;

  @IsEnum(PushPlatform)
  platform!: PushPlatform;
}
