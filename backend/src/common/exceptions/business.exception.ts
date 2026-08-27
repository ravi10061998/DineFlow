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

export const CartErrors = {
  differentRestaurant: (existingRestaurantName: string) =>
    new BusinessException(
      "CART_DIFFERENT_RESTAURANT",
      `Your cart already has items from ${existingRestaurantName}. Clear it before adding items from another restaurant.`,
      HttpStatus.CONFLICT,
    ),
  productUnavailable: () =>
    new BusinessException("PRODUCT_UNAVAILABLE", "This item is currently unavailable.", HttpStatus.CONFLICT),
  invalidVariant: () =>
    new BusinessException("INVALID_VARIANT", "The selected variant does not belong to this product.", HttpStatus.BAD_REQUEST),
  invalidAddon: () =>
    new BusinessException("INVALID_ADDON", "One or more selected add-ons do not belong to this product.", HttpStatus.BAD_REQUEST),
};

export const OrderErrors = {
  cartEmpty: () => new BusinessException("CART_EMPTY", "Your cart is empty — add items before checking out.", HttpStatus.BAD_REQUEST),
  itemsUnavailable: () =>
    new BusinessException(
      "CART_ITEMS_UNAVAILABLE",
      "One or more items in your cart are no longer available. Remove or replace them before checking out.",
      HttpStatus.CONFLICT,
    ),
  invalidStatusTransition: (from: string, to: string) =>
    new BusinessException("INVALID_STATUS_TRANSITION", `Cannot move an order from ${from} to ${to}.`, HttpStatus.BAD_REQUEST),
  cannotBeCancelled: () =>
    new BusinessException(
      "ORDER_CANNOT_BE_CANCELLED",
      "This order can no longer be cancelled — it has already been confirmed by the restaurant.",
      HttpStatus.CONFLICT,
    ),
};

export const PaymentErrors = {
  alreadyPaid: () => new BusinessException("ORDER_ALREADY_PAID", "This order has already been paid for.", HttpStatus.CONFLICT),
  orderCancelled: () =>
    new BusinessException("ORDER_CANCELLED", "This order was cancelled and can no longer be paid for.", HttpStatus.CONFLICT),
  alreadyProcessed: () =>
    new BusinessException("PAYMENT_ALREADY_PROCESSED", "This payment attempt has already been processed.", HttpStatus.CONFLICT),
  verificationFailed: () =>
    new BusinessException("PAYMENT_VERIFICATION_FAILED", "Payment verification failed.", HttpStatus.BAD_REQUEST),
};

export const RefundErrors = {
  noSucceededPayment: () =>
    new BusinessException("NO_SUCCEEDED_PAYMENT", "This order has no successful payment to refund.", HttpStatus.CONFLICT),
};

export const FoodCategoryErrors = {
  slugTaken: (slug: string) =>
    new BusinessException("FOOD_CATEGORY_SLUG_TAKEN", `A food category with slug "${slug}" already exists.`, HttpStatus.CONFLICT),
};

export const OfferErrors = {
  codeTaken: (code: string) =>
    new BusinessException("OFFER_CODE_TAKEN", `An offer with code "${code}" already exists.`, HttpStatus.CONFLICT),
};

export const BlogErrors = {
  slugTaken: (slug: string) => new BusinessException("BLOG_SLUG_TAKEN", `A blog with slug "${slug}" already exists.`, HttpStatus.CONFLICT),
  categorySlugTaken: (slug: string) =>
    new BusinessException("BLOG_CATEGORY_SLUG_TAKEN", `A blog category with slug "${slug}" already exists.`, HttpStatus.CONFLICT),
};

export const PayoutErrors = {
  notFailed: () =>
    new BusinessException("PAYOUT_NOT_FAILED", "Only a failed payout can be retried.", HttpStatus.CONFLICT),
  bankAccountNotVerified: () =>
    new BusinessException(
      "BANK_ACCOUNT_NOT_VERIFIED",
      "This restaurant has no admin-verified bank account on file — a payout can't be sent anywhere.",
      HttpStatus.CONFLICT,
    ),
};

export const BankAccountErrors = {
  alreadyVerified: () =>
    new BusinessException(
      "BANK_ACCOUNT_ALREADY_VERIFIED",
      "This bank account is already verified — only a pending submission can be verified or rejected.",
      HttpStatus.CONFLICT,
    ),
};

export const DeliveryAssignmentErrors = {
  invalidTransition: (from: string, to: string) =>
    new BusinessException("INVALID_STATUS_TRANSITION", `Cannot move a delivery assignment from ${from} to ${to}.`, HttpStatus.BAD_REQUEST),
  invalidOtp: () =>
    new BusinessException("INVALID_DELIVERY_OTP", "That delivery code doesn't match.", HttpStatus.BAD_REQUEST),
};

export const CouponErrors = {
  codeTaken: (code: string) =>
    new BusinessException("COUPON_CODE_TAKEN", `A coupon with code "${code}" already exists.`, HttpStatus.CONFLICT),
  notFound: () => new BusinessException("COUPON_NOT_FOUND", "That coupon code doesn't exist.", HttpStatus.NOT_FOUND),
  inactive: () => new BusinessException("COUPON_INACTIVE", "That coupon is no longer active.", HttpStatus.CONFLICT),
  notYetActive: () => new BusinessException("COUPON_NOT_YET_ACTIVE", "That coupon isn't valid yet.", HttpStatus.CONFLICT),
  expired: () => new BusinessException("COUPON_EXPIRED", "That coupon has expired.", HttpStatus.CONFLICT),
  minOrderNotMet: (minOrderAmount: string) =>
    new BusinessException(
      "COUPON_MIN_ORDER_NOT_MET",
      `This coupon requires a minimum order of ₹${minOrderAmount}.`,
      HttpStatus.CONFLICT,
    ),
  notApplicable: (restaurantName: string) =>
    new BusinessException(
      "COUPON_NOT_APPLICABLE",
      `This coupon can only be used at ${restaurantName}.`,
      HttpStatus.CONFLICT,
    ),
  customerLimitReached: () =>
    new BusinessException("COUPON_CUSTOMER_LIMIT_REACHED", "You've already used this coupon the maximum number of times.", HttpStatus.CONFLICT),
  totalLimitReached: () =>
    new BusinessException("COUPON_TOTAL_LIMIT_REACHED", "This coupon has reached its total redemption limit.", HttpStatus.CONFLICT),
};

export const ReviewErrors = {
  orderNotDelivered: () =>
    new BusinessException(
      "ORDER_NOT_DELIVERED",
      "You can only review an order after it has been delivered.",
      HttpStatus.CONFLICT,
    ),
  alreadyReviewed: () =>
    new BusinessException("ORDER_ALREADY_REVIEWED", "You've already reviewed this order.", HttpStatus.CONFLICT),
};

export const DeliveryPartnerErrors = {
  invalidStatusTransition: (from: string, to: string) =>
    new BusinessException("INVALID_STATUS_TRANSITION", `Cannot move a delivery partner from ${from} to ${to}.`, HttpStatus.BAD_REQUEST),
  notApproved: () =>
    new BusinessException(
      "DELIVERY_PARTNER_NOT_APPROVED",
      "Only an approved delivery partner can go online.",
      HttpStatus.CONFLICT,
    ),
};
