import { ArrayUnique, IsUUID } from "class-validator";

export class SyncRolePermissionsDto {
  @IsUUID(undefined, { each: true })
  @ArrayUnique()
  permissionIds!: string[];
}
