import { IsString, MaxLength, MinLength } from "class-validator";

/** Used for reject/suspend/block — approve needs no reason, these all do. */
export class StatusChangeReasonDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
