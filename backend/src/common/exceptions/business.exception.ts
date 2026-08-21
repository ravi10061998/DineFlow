import { HttpException, HttpStatus } from "@nestjs/common";

/**
 * Business errors that map to a stable, machine-readable `code` (per spec §37).
 * Never throw a raw Error/HttpException for expected business failures —
 * always use this so the response envelope's `error.code` stays consistent
 * across every module.
 */
export class BusinessException extends HttpException {
  public readonly code: string;

  constructor(code: string, message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(message, status);
    this.code = code;
  }
}

export const AuthErrors = {
  invalidCredentials: () =>
    new BusinessException("INVALID_CREDENTIALS", "Email or password is incorrect.", HttpStatus.UNAUTHORIZED),
  accountSuspended: () =>
    new BusinessException("ACCOUNT_SUSPENDED", "This account has been suspended.", HttpStatus.FORBIDDEN),
  accountInactive: () =>
    new BusinessException("ACCOUNT_INACTIVE", "This account is inactive.", HttpStatus.FORBIDDEN),
  emailAlreadyRegistered: () =>
    new BusinessException("EMAIL_ALREADY_REGISTERED", "This email is already registered.", HttpStatus.CONFLICT),
  invalidRefreshToken: () =>
    new BusinessException("INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired.", HttpStatus.UNAUTHORIZED),
  tokenAlreadyUsed: () =>
    new BusinessException("TOKEN_ALREADY_USED", "This token has already been used.", HttpStatus.BAD_REQUEST),
  tokenInvalidOrExpired: () =>
    new BusinessException("TOKEN_INVALID_OR_EXPIRED", "This token is invalid or has expired.", HttpStatus.BAD_REQUEST),
  roleInUse: () =>
    new BusinessException("ROLE_IN_USE", "This role is still assigned to one or more users.", HttpStatus.CONFLICT),
  systemRoleProtected: () =>
    new BusinessException("SYSTEM_ROLE_PROTECTED", "System roles cannot be modified or deleted.", HttpStatus.FORBIDDEN),
  insufficientPermissions: () =>
    new BusinessException("INSUFFICIENT_PERMISSIONS", "You do not have permission to perform this action.", HttpStatus.FORBIDDEN),
};

/** Shared across modules — a system role a feature depends on wasn't seeded (a deployment/migration problem, not a user error). */
export const SystemErrors = {
  roleNotSeeded: (roleName: string) =>
    new BusinessException(
      "ROLE_NOT_SEEDED",
      `${roleName} role is missing — run database seed migrations.`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    ),
};

export const RestaurantErrors = {
  invalidStatusTransition: (from: string, to: string) =>
    new BusinessException(
      "INVALID_STATUS_TRANSITION",
      `Cannot move a restaurant from ${from} to ${to}.`,
      HttpStatus.BAD_REQUEST,
    ),
};

export const SubscriptionErrors = {
  planInUse: () =>
    new BusinessException(
      "PLAN_IN_USE",
      "This plan has active subscribers and cannot be deleted — deactivate it instead.",
      HttpStatus.CONFLICT,
    ),
  planNotActive: () =>
    new BusinessException("PLAN_NOT_ACTIVE", "This plan is no longer available for new subscriptions.", HttpStatus.BAD_REQUEST),
  noSubscription: () =>
    new BusinessException("NO_SUBSCRIPTION", "This restaurant has no subscription record yet.", HttpStatus.NOT_FOUND),
};

export const CommissionErrors = {
  noCommissionSource: () =>
    new BusinessException(
      "NO_COMMISSION_SOURCE",
      "This restaurant has no active commission override, plan, or trial to derive a commission rate from.",
      HttpStatus.CONFLICT,
    ),
};

export const CategoryErrors = {
  nameTaken: (name: string) =>
    new BusinessException("CATEGORY_NAME_TAKEN", `A category named "${name}" already exists.`, HttpStatus.CONFLICT),
  inUse: () =>
    new BusinessException(
      "CATEGORY_IN_USE",
      "This category still has products in it and cannot be deleted — deactivate it instead.",
      HttpStatus.CONFLICT,
    ),
  reorderInvalid: () =>
    new BusinessException(
      "REORDER_INVALID",
      "The category list must contain exactly this restaurant's categories, each exactly once.",
      HttpStatus.BAD_REQUEST,
    ),
};

export const ProductErrors = {
  reorderInvalid: () =>
    new BusinessException(
      "REORDER_INVALID",
      "The product list must contain exactly this category's products, each exactly once.",
      HttpStatus.BAD_REQUEST,
    ),
};

export const CustomerErrors = {
  phoneTaken: () =>
    new BusinessException("PHONE_ALREADY_IN_USE", "This phone number is already in use by another account.", HttpStatus.CONFLICT),
};

export const AddressErrors = {
  limitReached: (max: number) =>
    new BusinessException("ADDRESS_LIMIT_REACHED", `You can save at most ${max} addresses — delete one before adding another.`, HttpStatus.CONFLICT),
};
