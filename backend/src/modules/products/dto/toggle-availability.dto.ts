import { IsBoolean } from "class-validator";

export class ToggleAvailabilityDto {
  @IsBoolean()
  isAvailable!: boolean;
}
