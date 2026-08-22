import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { AuthenticatedUser } from "../../../common/decorators/current-user.decorator";
import { SystemRoleName } from "../../roles/entities/role.entity";

/**
 * Guards every `/delivery-partner/me/*` self-service route. Identity check,
 * not a permission check — same shape as CustomerGuard, keyed off role name
 * since a delivery partner has no restaurantId-style tenant anchor either.
 */
@Injectable()
export class DeliveryPartnerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;
    if (user?.roleName !== SystemRoleName.DELIVERY_PARTNER) {
      throw new ForbiddenException("This account is not a delivery partner account.");
    }
    return true;
  }
}
