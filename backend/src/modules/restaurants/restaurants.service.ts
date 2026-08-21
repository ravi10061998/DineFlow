import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { DataSource, Repository } from "typeorm";
import {
  RESTAURANT_STATUS_CHANGED_EVENT,
  RestaurantStatusChangedEvent,
} from "../../common/events/restaurant-status-changed.event";
import { Restaurant, RestaurantStatus } from "./entities/restaurant.entity";
import { RestaurantBusinessHours } from "./entities/restaurant-business-hours.entity";
import { RestaurantHoliday } from "./entities/restaurant-holiday.entity";
import { RestaurantStatusHistory } from "./entities/restaurant-status-history.entity";
import { RegisterRestaurantDto } from "./dto/register-restaurant.dto";
import { UpdateRestaurantDto } from "./dto/update-restaurant.dto";
import { SetBusinessHoursDto } from "./dto/set-business-hours.dto";
import { CreateHolidayDto } from "./dto/create-holiday.dto";
import { UsersService } from "../users/users.service";
import { RolesService } from "../roles/roles.service";
import { SystemRoleName } from "../roles/entities/role.entity";
import { User, UserStatus } from "../users/entities/user.entity";
import { AuthErrors, RestaurantErrors, SystemErrors } from "../../common/exceptions/business.exception";
import { hashPassword } from "../../common/utils/password.util";

/** Valid restaurant lifecycle transitions. BLOCKED is terminal through these endpoints. */
const ALLOWED_TRANSITIONS: Record<RestaurantStatus, RestaurantStatus[]> = {
  [RestaurantStatus.PENDING]: [RestaurantStatus.APPROVED, RestaurantStatus.REJECTED],
  [RestaurantStatus.APPROVED]: [RestaurantStatus.SUSPENDED, RestaurantStatus.BLOCKED],
  [RestaurantStatus.REJECTED]: [RestaurantStatus.PENDING],
  [RestaurantStatus.SUSPENDED]: [RestaurantStatus.APPROVED, RestaurantStatus.BLOCKED],
  [RestaurantStatus.BLOCKED]: [],
};

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectRepository(Restaurant) private readonly restaurantsRepository: Repository<Restaurant>,
    @InjectRepository(RestaurantBusinessHours)
    private readonly businessHoursRepository: Repository<RestaurantBusinessHours>,
    @InjectRepository(RestaurantHoliday) private readonly holidaysRepository: Repository<RestaurantHoliday>,
    @InjectRepository(RestaurantStatusHistory)
    private readonly statusHistoryRepository: Repository<RestaurantStatusHistory>,
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base = this.slugify(name) || "restaurant";
    let candidate = base;
    let suffix = 2;
    while (await this.restaurantsRepository.exists({ where: { slug: candidate } })) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  /**
   * Creates the Restaurant (PENDING) and its first RESTAURANT_ADMIN user atomically —
   * never leave a restaurant without an owner or an owner without a restaurant.
   */
  async register(dto: RegisterRestaurantDto): Promise<{ restaurant: Restaurant; user: User }> {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw AuthErrors.emailAlreadyRegistered();
    }

    const restaurantAdminRole = await this.rolesService.findByName(SystemRoleName.RESTAURANT_ADMIN);
    if (!restaurantAdminRole) {
      throw SystemErrors.roleNotSeeded(SystemRoleName.RESTAURANT_ADMIN);
    }

    const slug = await this.generateUniqueSlug(dto.restaurantName);

    return this.dataSource.transaction(async (manager) => {
      const restaurant = manager.create(Restaurant, {
        name: dto.restaurantName,
        slug,
        ownerFullName: dto.ownerFullName,
        email: dto.email,
        phone: dto.phone,
        status: RestaurantStatus.PENDING,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2 ?? null,
        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode,
        country: dto.country.toUpperCase(),
        latitude: dto.latitude !== undefined ? String(dto.latitude) : null,
        longitude: dto.longitude !== undefined ? String(dto.longitude) : null,
      });
      await manager.save(restaurant);

      const passwordHash = await hashPassword(dto.password);
      const user = manager.create(User, {
        email: dto.email,
        passwordHash,
        fullName: dto.ownerFullName,
        roleId: restaurantAdminRole.id,
        restaurantId: restaurant.id,
        status: UserStatus.ACTIVE,
      });
      await manager.save(user);

      user.role = restaurantAdminRole;
      return { restaurant, user };
    });
  }

  async findByIdOrThrow(id: string): Promise<Restaurant> {
    const restaurant = await this.restaurantsRepository.findOne({ where: { id } });
    if (!restaurant) {
      throw new NotFoundException("Restaurant not found");
    }
    return restaurant;
  }

  async findAll(status?: RestaurantStatus): Promise<Restaurant[]> {
    return this.restaurantsRepository.find({
      where: status ? { status } : {},
      order: { createdAt: "DESC" },
    });
  }

  async setFeatured(id: string, isFeatured: boolean): Promise<Restaurant> {
    const restaurant = await this.findByIdOrThrow(id);
    restaurant.isFeatured = isFeatured;
    return this.restaurantsRepository.save(restaurant);
  }

  /** Used by the admin dashboard summary — one grouped count query rather than fetching every row. */
  async countByStatus(): Promise<Record<RestaurantStatus, number>> {
    const rows = await this.restaurantsRepository
      .createQueryBuilder("restaurant")
      .select("restaurant.status", "status")
      .addSelect("COUNT(*)", "count")
      .groupBy("restaurant.status")
      .getRawMany<{ status: RestaurantStatus; count: string }>();

    const counts = Object.fromEntries(Object.values(RestaurantStatus).map((status) => [status, 0])) as Record<
      RestaurantStatus,
      number
    >;
    for (const row of rows) {
      counts[row.status] = Number(row.count);
    }
    return counts;
  }

  async updateOwnProfile(restaurantId: string, dto: UpdateRestaurantDto): Promise<Restaurant> {
    const restaurant = await this.findByIdOrThrow(restaurantId);
    Object.assign(restaurant, {
      ...dto,
      latitude: dto.latitude !== undefined ? String(dto.latitude) : restaurant.latitude,
      longitude: dto.longitude !== undefined ? String(dto.longitude) : restaurant.longitude,
      deliveryRadiusKm: dto.deliveryRadiusKm !== undefined ? String(dto.deliveryRadiusKm) : restaurant.deliveryRadiusKm,
    });
    return this.restaurantsRepository.save(restaurant);
  }

  private async transitionStatus(
    restaurantId: string,
    toStatus: RestaurantStatus,
    changedByUserId: string,
    reason: string | null,
  ): Promise<Restaurant> {
    let fromStatus!: RestaurantStatus;

    const restaurant = await this.dataSource.transaction(async (manager) => {
      const current = await manager.findOne(Restaurant, { where: { id: restaurantId } });
      if (!current) {
        throw new NotFoundException("Restaurant not found");
      }

      const allowed = ALLOWED_TRANSITIONS[current.status] ?? [];
      if (!allowed.includes(toStatus)) {
        throw RestaurantErrors.invalidStatusTransition(current.status, toStatus);
      }

      fromStatus = current.status;
      current.status = toStatus;
      current.rejectionReason = toStatus === RestaurantStatus.REJECTED ? reason : null;
      await manager.save(current);

      const history = manager.create(RestaurantStatusHistory, {
        restaurantId,
        fromStatus,
        toStatus,
        reason,
        changedByUserId,
      });
      await manager.save(history);

      return current;
    });

    // Emitted only after commit — listeners (e.g. Subscriptions starting a
    // trial) must never act on a transition that could still roll back.
    this.eventEmitter.emit(
      RESTAURANT_STATUS_CHANGED_EVENT,
      new RestaurantStatusChangedEvent(restaurantId, fromStatus, toStatus, changedByUserId),
    );

    return restaurant;
  }

  approve(restaurantId: string, changedByUserId: string): Promise<Restaurant> {
    return this.transitionStatus(restaurantId, RestaurantStatus.APPROVED, changedByUserId, null);
  }

  reject(restaurantId: string, changedByUserId: string, reason: string): Promise<Restaurant> {
    return this.transitionStatus(restaurantId, RestaurantStatus.REJECTED, changedByUserId, reason);
  }

  suspend(restaurantId: string, changedByUserId: string, reason: string): Promise<Restaurant> {
    return this.transitionStatus(restaurantId, RestaurantStatus.SUSPENDED, changedByUserId, reason);
  }

  block(restaurantId: string, changedByUserId: string, reason: string): Promise<Restaurant> {
    return this.transitionStatus(restaurantId, RestaurantStatus.BLOCKED, changedByUserId, reason);
  }

  reinstate(restaurantId: string, changedByUserId: string): Promise<Restaurant> {
    return this.transitionStatus(restaurantId, RestaurantStatus.APPROVED, changedByUserId, null);
  }

  /** REJECTED -> PENDING, so the restaurant can be resubmitted for review after fixing whatever caused the rejection. */
  resubmit(restaurantId: string, changedByUserId: string): Promise<Restaurant> {
    return this.transitionStatus(restaurantId, RestaurantStatus.PENDING, changedByUserId, null);
  }

  async replaceBusinessHours(restaurantId: string, dto: SetBusinessHoursDto): Promise<RestaurantBusinessHours[]> {
    await this.findByIdOrThrow(restaurantId);
    return this.dataSource.transaction(async (manager) => {
      await manager.delete(RestaurantBusinessHours, { restaurantId });
      const rows = dto.entries.map((entry) =>
        manager.create(RestaurantBusinessHours, {
          restaurantId,
          dayOfWeek: entry.dayOfWeek,
          openTime: entry.isClosed ? "00:00" : entry.openTime!,
          closeTime: entry.isClosed ? "00:00" : entry.closeTime!,
          isClosed: entry.isClosed ?? false,
        }),
      );
      return manager.save(rows);
    });
  }

  getBusinessHours(restaurantId: string): Promise<RestaurantBusinessHours[]> {
    return this.businessHoursRepository.find({ where: { restaurantId }, order: { dayOfWeek: "ASC" } });
  }

  async addHoliday(restaurantId: string, dto: CreateHolidayDto): Promise<RestaurantHoliday> {
    await this.findByIdOrThrow(restaurantId);
    const holiday = this.holidaysRepository.create({ restaurantId, date: dto.date, reason: dto.reason ?? null });
    return this.holidaysRepository.save(holiday);
  }

  getHolidays(restaurantId: string): Promise<RestaurantHoliday[]> {
    return this.holidaysRepository.find({ where: { restaurantId }, order: { date: "ASC" } });
  }

  async removeHoliday(restaurantId: string, holidayId: string): Promise<void> {
    const holiday = await this.holidaysRepository.findOne({ where: { id: holidayId, restaurantId } });
    if (!holiday) {
      throw new NotFoundException("Holiday not found");
    }
    await this.holidaysRepository.remove(holiday);
  }

  getStatusHistory(restaurantId: string): Promise<RestaurantStatusHistory[]> {
    return this.statusHistoryRepository.find({ where: { restaurantId }, order: { createdAt: "DESC" } });
  }
}
