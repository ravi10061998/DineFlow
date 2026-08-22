import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { OnEvent } from "@nestjs/event-emitter";
import { In, Repository } from "typeorm";
import * as crypto from "crypto";
import { DeliveryAssignment, DeliveryAssignmentStatus } from "./entities/delivery-assignment.entity";
import { DeliveryPartner, DeliveryPartnerStatus } from "../delivery-partners/entities/delivery-partner.entity";
import { OrderStatus } from "../orders/entities/order.entity";
import { OrdersService } from "../orders/orders.service";
import { RestaurantsService } from "../restaurants/restaurants.service";
import { ORDER_STATUS_CHANGED_EVENT, OrderStatusChangedEvent } from "../../common/events/order-status-changed.event";
import { DeliveryAssignmentErrors } from "../../common/exceptions/business.exception";

/** Assignments in these statuses still occupy the partner — they can't be handed a second delivery at once. */
const ACTIVE_STATUSES = [DeliveryAssignmentStatus.ASSIGNED, DeliveryAssignmentStatus.ACCEPTED, DeliveryAssignmentStatus.PICKED_UP];

const ALLOWED_TRANSITIONS: Record<DeliveryAssignmentStatus, DeliveryAssignmentStatus[]> = {
  [DeliveryAssignmentStatus.ASSIGNED]: [DeliveryAssignmentStatus.ACCEPTED, DeliveryAssignmentStatus.REJECTED],
  [DeliveryAssignmentStatus.ACCEPTED]: [DeliveryAssignmentStatus.PICKED_UP],
  [DeliveryAssignmentStatus.PICKED_UP]: [DeliveryAssignmentStatus.DELIVERED],
  [DeliveryAssignmentStatus.REJECTED]: [],
  [DeliveryAssignmentStatus.DELIVERED]: [],
};

@Injectable()
export class DeliveryAssignmentsService {
  constructor(
    @InjectRepository(DeliveryAssignment) private readonly assignmentsRepository: Repository<DeliveryAssignment>,
    @InjectRepository(DeliveryPartner) private readonly partnersRepository: Repository<DeliveryPartner>,
    private readonly ordersService: OrdersService,
    private readonly restaurantsService: RestaurantsService,
  ) {}

  /** Auto-assign the moment a restaurant marks an order READY — Orders stays unaware this module exists. */
  @OnEvent(ORDER_STATUS_CHANGED_EVENT)
  async handleOrderStatusChanged(event: OrderStatusChangedEvent): Promise<void> {
    if (event.toStatus !== OrderStatus.READY) {
      return;
    }
    await this.tryAssign(event.orderId);
  }

  /**
   * Finds the nearest online, approved, currently-unoccupied partner (excluding
   * anyone who already rejected this exact order) and assigns them. Returns
   * null — a legitimate no-op, not an error — if no candidate is available
   * (no partners online, none with a shared location, or the restaurant
   * itself has no coordinates to measure distance from).
   */
  async tryAssign(orderId: string): Promise<DeliveryAssignment | null> {
    const order = await this.ordersService.findOneOrThrow(orderId);
    const restaurant = await this.restaurantsService.findByIdOrThrow(order.restaurantId);
    if (restaurant.latitude === null || restaurant.longitude === null) {
      return null;
    }

    const rejectedByPartnerIds = (
      await this.assignmentsRepository.find({ where: { orderId, status: DeliveryAssignmentStatus.REJECTED } })
    ).map((a) => a.deliveryPartnerId);

    const busyPartnerIds = (await this.assignmentsRepository.find({ where: { status: In(ACTIVE_STATUSES) } })).map(
      (a) => a.deliveryPartnerId,
    );

    const candidates = await this.partnersRepository.find({ where: { status: DeliveryPartnerStatus.APPROVED, isOnline: true } });
    const restaurantLat = Number(restaurant.latitude);
    const restaurantLng = Number(restaurant.longitude);

    const nearest = candidates
      .filter((p) => !rejectedByPartnerIds.includes(p.id) && !busyPartnerIds.includes(p.id))
      .filter((p) => p.currentLatitude !== null && p.currentLongitude !== null)
      .map((p) => ({ partner: p, distanceKm: this.haversineKm(restaurantLat, restaurantLng, Number(p.currentLatitude), Number(p.currentLongitude)) }))
      .sort((a, b) => a.distanceKm - b.distanceKm)[0];

    if (!nearest) {
      return null;
    }

    const assignment = this.assignmentsRepository.create({
      orderId,
      restaurantId: order.restaurantId,
      deliveryPartnerId: nearest.partner.id,
      status: DeliveryAssignmentStatus.ASSIGNED,
      deliveryOtp: this.generateOtp(),
    });
    return this.assignmentsRepository.save(assignment);
  }

  async findForPartnerUserId(userId: string): Promise<DeliveryAssignment[]> {
    const partner = await this.partnersRepository.findOne({ where: { userId } });
    if (!partner) {
      throw new NotFoundException("Delivery partner profile not found");
    }
    return this.assignmentsRepository.find({
      where: { deliveryPartnerId: partner.id },
      relations: { order: true },
      order: { createdAt: "DESC" },
    });
  }

  async findForOrder(orderId: string): Promise<DeliveryAssignment | null> {
    return this.assignmentsRepository.findOne({
      where: { orderId },
      relations: { deliveryPartner: { user: true } },
      order: { createdAt: "DESC" },
    });
  }

  findAllForAdmin(): Promise<DeliveryAssignment[]> {
    return this.assignmentsRepository.find({
      relations: { order: true, deliveryPartner: { user: true } },
      order: { createdAt: "DESC" },
    });
  }

  private async findOwnedByPartnerUserId(id: string, userId: string): Promise<DeliveryAssignment> {
    const partner = await this.partnersRepository.findOne({ where: { userId } });
    if (!partner) {
      throw new NotFoundException("Delivery partner profile not found");
    }
    const assignment = await this.assignmentsRepository.findOne({ where: { id } });
    if (!assignment) {
      throw new NotFoundException("Delivery assignment not found");
    }
    if (assignment.deliveryPartnerId !== partner.id) {
      throw new ForbiddenException("This delivery assignment doesn't belong to you.");
    }
    return assignment;
  }

  private async transition(assignment: DeliveryAssignment, toStatus: DeliveryAssignmentStatus): Promise<DeliveryAssignment> {
    const allowed = ALLOWED_TRANSITIONS[assignment.status] ?? [];
    if (!allowed.includes(toStatus)) {
      throw DeliveryAssignmentErrors.invalidTransition(assignment.status, toStatus);
    }
    assignment.status = toStatus;
    if (toStatus === DeliveryAssignmentStatus.ACCEPTED) assignment.acceptedAt = new Date();
    if (toStatus === DeliveryAssignmentStatus.PICKED_UP) assignment.pickedUpAt = new Date();
    if (toStatus === DeliveryAssignmentStatus.DELIVERED) assignment.deliveredAt = new Date();
    return this.assignmentsRepository.save(assignment);
  }

  async accept(id: string, userId: string): Promise<DeliveryAssignment> {
    const assignment = await this.findOwnedByPartnerUserId(id, userId);
    return this.transition(assignment, DeliveryAssignmentStatus.ACCEPTED);
  }

  /** Rejecting frees the partner and immediately tries the next-nearest candidate for the same order. */
  async reject(id: string, userId: string): Promise<DeliveryAssignment> {
    const assignment = await this.findOwnedByPartnerUserId(id, userId);
    const rejected = await this.transition(assignment, DeliveryAssignmentStatus.REJECTED);
    await this.tryAssign(assignment.orderId);
    return rejected;
  }

  async pickedUp(id: string, userId: string): Promise<DeliveryAssignment> {
    const assignment = await this.findOwnedByPartnerUserId(id, userId);
    return this.transition(assignment, DeliveryAssignmentStatus.PICKED_UP);
  }

  async deliver(id: string, userId: string, otp: string): Promise<DeliveryAssignment> {
    const assignment = await this.findOwnedByPartnerUserId(id, userId);
    if (assignment.deliveryOtp !== otp) {
      throw DeliveryAssignmentErrors.invalidOtp();
    }
    return this.transition(assignment, DeliveryAssignmentStatus.DELIVERED);
  }

  private generateOtp(): string {
    return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  }

  private haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }
}
