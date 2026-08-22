import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { DataSource, Repository } from "typeorm";
import * as crypto from "crypto";
import { ORDER_STATUS_CHANGED_EVENT, OrderStatusChangedEvent } from "../../common/events/order-status-changed.event";
import { Order, OrderStatus } from "./entities/order.entity";
import { OrderItem } from "./entities/order-item.entity";
import { OrderStatusHistory } from "./entities/order-status-history.entity";
import { CartItem } from "../cart/entities/cart-item.entity";
import { CartService } from "../cart/cart.service";
import { AddressesService } from "../addresses/addresses.service";
import { CommissionService } from "../commission/commission.service";
import { RestaurantsService } from "../restaurants/restaurants.service";
import { DeliveryFeeService } from "../delivery-fee/delivery-fee.service";
import { CouponsService } from "../coupons/coupons.service";
import { OrderErrors } from "../../common/exceptions/business.exception";

/** Valid order fulfillment transitions. DELIVERED and CANCELLED are terminal. */
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PLACED]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
  [OrderStatus.READY]: [OrderStatus.OUT_FOR_DELIVERY],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

const RELATIONS = { items: true } as const;

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly ordersRepository: Repository<Order>,
    private readonly cartService: CartService,
    private readonly addressesService: AddressesService,
    private readonly commissionService: CommissionService,
    private readonly restaurantsService: RestaurantsService,
    private readonly deliveryFeeService: DeliveryFeeService,
    private readonly couponsService: CouponsService,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  findAllForCustomer(customerId: string): Promise<Order[]> {
    return this.ordersRepository.find({ where: { customerId }, relations: RELATIONS, order: { createdAt: "DESC" } });
  }

  findAllForRestaurant(restaurantId: string): Promise<Order[]> {
    return this.ordersRepository.find({ where: { restaurantId }, relations: RELATIONS, order: { createdAt: "DESC" } });
  }

  findAllForAdmin(): Promise<Order[]> {
    return this.ordersRepository.find({ relations: RELATIONS, order: { createdAt: "DESC" } });
  }

  async findOneOrThrow(id: string, scope?: { customerId?: string; restaurantId?: string }): Promise<Order> {
    const order = await this.ordersRepository.findOne({ where: { id, ...scope }, relations: RELATIONS });
    if (!order) {
      throw new NotFoundException("Order not found");
    }
    return order;
  }

  /**
   * Lets the cart page show a real delivery-fee estimate before the customer commits —
   * same calculation checkout itself will use, just without creating anything.
   */
  async previewDeliveryFee(customerId: string, deliveryAddressId: string) {
    const cart = await this.cartService.getCart(customerId);
    if (cart.items.length === 0 || !cart.restaurantId) {
      throw OrderErrors.cartEmpty();
    }
    const address = await this.addressesService.findOneOrThrow(deliveryAddressId, customerId);
    const restaurant = await this.restaurantsService.findByIdOrThrow(cart.restaurantId);
    return this.deliveryFeeService.calculate({
      restaurantLat: restaurant.latitude,
      restaurantLng: restaurant.longitude,
      addressLat: address.latitude,
      addressLng: address.longitude,
      subtotal: Number(cart.subtotal),
    });
  }

  /**
   * Lets the cart page show a real discount preview before committing — same
   * validation checkout itself runs, just unlocked/non-transactional (see
   * `CouponsService.preview`'s own doc comment on why that's safe here).
   */
  async previewCoupon(customerId: string, code: string) {
    const cart = await this.cartService.getCart(customerId);
    if (cart.items.length === 0 || !cart.restaurantId) {
      throw OrderErrors.cartEmpty();
    }
    const restaurant = await this.restaurantsService.findByIdOrThrow(cart.restaurantId);
    return this.couponsService.preview({
      code,
      customerId,
      restaurantId: cart.restaurantId,
      restaurantName: restaurant.name,
      subtotal: Number(cart.subtotal),
    });
  }

  async checkout(customerId: string, deliveryAddressId: string, couponCode?: string): Promise<Order> {
    const cart = await this.cartService.getCart(customerId);
    if (cart.items.length === 0 || !cart.restaurantId) {
      throw OrderErrors.cartEmpty();
    }
    if (cart.items.some((item) => !item.isAvailable)) {
      throw OrderErrors.itemsUnavailable();
    }

    const address = await this.addressesService.findOneOrThrow(deliveryAddressId, customerId);
    const restaurant = await this.restaurantsService.findByIdOrThrow(cart.restaurantId);
    const commission = await this.commissionService.calculateCommission(cart.restaurantId, Number(cart.subtotal));
    // Delivery fee is computed off subtotal only and never feeds the restaurant's payout — it's a
    // delivery-domain charge, not food revenue. Module 20 (Delivery Assignment)'s partner-facing
    // ledger is a later module; this order-level snapshot is the fee the CUSTOMER paid, full stop.
    const deliveryFee = await this.deliveryFeeService.calculate({
      restaurantLat: restaurant.latitude,
      restaurantLng: restaurant.longitude,
      addressLat: address.latitude,
      addressLng: address.longitude,
      subtotal: Number(cart.subtotal),
    });

    const order = await this.dataSource.transaction(async (manager) => {
      // Re-validated INSIDE the transaction (never trust a client-side preview) and row-locked so
      // two concurrent checkouts racing a near-exhausted limit can't both redeem past it.
      let discountAmount = "0.00";
      let couponId: string | null = null;
      let normalizedCouponCode: string | null = null;
      if (couponCode) {
        const result = await this.couponsService.validateAndLock(manager, {
          code: couponCode,
          customerId,
          restaurantId: cart.restaurantId!,
          restaurantName: restaurant.name,
          subtotal: Number(cart.subtotal),
        });
        discountAmount = result.discountAmount;
        couponId = result.coupon.id;
        normalizedCouponCode = result.coupon.code;
      }
      const totalAmount = (Number(cart.subtotal) + Number(deliveryFee.fee) - Number(discountAmount)).toFixed(2);

      const created = manager.create(Order, {
        orderNumber: this.generateOrderNumber(),
        customerId,
        restaurantId: cart.restaurantId!,
        deliveryAddressId: address.id,
        deliveryReceiverName: address.receiverName,
        deliveryReceiverPhone: address.receiverPhone,
        deliveryAddressLine1: address.addressLine1,
        deliveryAddressLine2: address.addressLine2,
        deliveryLandmark: address.landmark,
        deliveryCity: address.city,
        deliveryState: address.state,
        deliveryPostalCode: address.postalCode,
        deliveryCountry: address.country,
        deliveryLatitude: address.latitude,
        deliveryLongitude: address.longitude,
        subtotal: cart.subtotal,
        commissionAmount: commission.platformAmount.toFixed(2),
        restaurantPayoutAmount: commission.restaurantAmount.toFixed(2),
        deliveryFee: deliveryFee.fee,
        deliveryDistanceKm: deliveryFee.distanceKm !== null ? String(deliveryFee.distanceKm) : null,
        discountAmount,
        couponCode: normalizedCouponCode,
        totalAmount, // subtotal + deliveryFee - discountAmount
        status: OrderStatus.PLACED,
      });
      const savedOrder = await manager.save(created);

      if (couponId) {
        await this.couponsService.recordRedemption(manager, couponId, customerId, savedOrder.id, discountAmount);
      }

      const items = cart.items.map((item) =>
        manager.create(OrderItem, {
          orderId: savedOrder.id,
          productId: item.productId,
          productName: item.productName,
          variantId: item.variantId,
          variantName: item.variantName,
          addons: item.addons,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          lineTotal: item.lineTotal,
        }),
      );
      await manager.save(items);

      const history = manager.create(OrderStatusHistory, {
        orderId: savedOrder.id,
        fromStatus: null,
        toStatus: OrderStatus.PLACED,
        changedByUserId: customerId,
        reason: null,
      });
      await manager.save(history);

      await manager.delete(CartItem, { userId: customerId });

      return savedOrder;
    });

    return this.findOneOrThrow(order.id);
  }

  async cancelByCustomer(id: string, customerId: string, reason: string | undefined): Promise<Order> {
    const order = await this.findOneOrThrow(id, { customerId });
    if (order.status !== OrderStatus.PLACED) {
      throw OrderErrors.cannotBeCancelled();
    }
    return this.transitionStatus(order, OrderStatus.CANCELLED, customerId, reason ?? "Cancelled by customer");
  }

  async cancelByRestaurant(id: string, restaurantId: string, reason: string, changedByUserId: string): Promise<Order> {
    const order = await this.findOneOrThrow(id, { restaurantId });
    return this.transitionStatus(order, OrderStatus.CANCELLED, changedByUserId, reason);
  }

  async updateStatusByRestaurant(id: string, restaurantId: string, toStatus: OrderStatus, changedByUserId: string): Promise<Order> {
    const order = await this.findOneOrThrow(id, { restaurantId });
    return this.transitionStatus(order, toStatus, changedByUserId, null);
  }

  private async transitionStatus(order: Order, toStatus: OrderStatus, changedByUserId: string, reason: string | null): Promise<Order> {
    const allowed = ALLOWED_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(toStatus)) {
      throw OrderErrors.invalidStatusTransition(order.status, toStatus);
    }

    const fromStatus = order.status;
    await this.dataSource.transaction(async (manager) => {
      order.status = toStatus;
      order.cancellationReason = toStatus === OrderStatus.CANCELLED ? reason : order.cancellationReason;
      await manager.save(order);

      const history = manager.create(OrderStatusHistory, { orderId: order.id, fromStatus, toStatus, changedByUserId, reason });
      await manager.save(history);
    });

    // Emitted only after commit — Refunds' listener (e.g. auto-refunding a cancelled paid
    // order) must never act on a transition that could still roll back.
    this.eventEmitter.emit(ORDER_STATUS_CHANGED_EVENT, new OrderStatusChangedEvent(order.id, fromStatus, toStatus, changedByUserId));

    return this.findOneOrThrow(order.id);
  }

  private generateOrderNumber(): string {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomPart = crypto.randomBytes(3).toString("hex").toUpperCase();
    return `ORD-${datePart}-${randomPart}`;
  }
}
