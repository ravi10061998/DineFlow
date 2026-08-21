import { IsString, MaxLength, Matches } from "class-validator";

export class CreatePermissionDto {
  @IsString()
  @Matches(/^[a-z0-9_]+:[a-z0-9_]+$/, { message: "key must look like 'module:action', e.g. 'orders:read'" })
  @MaxLength(150)
  key!: string;

  @IsString()
  @MaxLength(255)
  description!: string;

  @IsString()
  @MaxLength(100)
  module!: string;
}
