import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { AuthenticatedUser } from "../../../common/decorators/current-user.decorator";

/**
 * Guards every `/restaurant/me/*` self-service route. This is an identity
 * check, not a permission check — RESTAURANT_ADMIN/RESTAURANT_STAFF users
 * always act on their own restaurantId (from the token), never one supplied
 * by the request. A user with no restaurantId (e.g. a CUSTOMER) is rejected.
 */
@Injectable()
export class RestaurantMemberGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;
    if (!user?.restaurantId) {
      throw new ForbiddenException("This account is not associated with a restaurant.");
    }
    return true;
  }
}
