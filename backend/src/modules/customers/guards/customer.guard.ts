import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { AuthenticatedUser } from "../../../common/decorators/current-user.decorator";
import { SystemRoleName } from "../../roles/entities/role.entity";

/**
 * Guards every `/customer/me/*` self-service route. Identity check, not a
 * permission check — mirrors RestaurantMemberGuard's shape, but keys off the
 * role name instead of a restaurantId (customers have no tenant anchor).
 */
@Injectable()
export class CustomerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;
    if (user?.roleName !== SystemRoleName.CUSTOMER) {
      throw new ForbiddenException("This account is not a customer account.");
    }
    return true;
  }
}
