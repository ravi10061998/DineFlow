import { SetMetadata } from "@nestjs/common";

export const PERMISSIONS_KEY = "requiredPermissions";

/**
 * Declares which permission keys a route requires, e.g.:
 *   @RequirePermissions('restaurants:approve')
 * Checked by PermissionsGuard against the permission list embedded in the
 * caller's JWT (resolved from their role at login/refresh time).
 */
export const RequirePermissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);
