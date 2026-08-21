import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface AuthenticatedUser {
  userId: string;
  email: string;
  roleId: string;
  roleName: string;
  permissions: string[];
  restaurantId: string | null;
}

/**
 * Reads the authenticated user off the request (populated by JwtStrategy).
 * This is the ONLY source of truth for identity/role/restaurantId in every
 * other module — never read these from request body/query params.
 */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
