import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { DeliveryPartner, DeliveryPartnerStatus } from "./entities/delivery-partner.entity";
import { DeliveryPartnerStatusHistory } from "./entities/delivery-partner-status-history.entity";
import { RegisterDeliveryPartnerDto } from "./dto/register-delivery-partner.dto";
import { UpdateDeliveryPartnerDto } from "./dto/update-delivery-partner.dto";
import { UpdateLocationDto } from "./dto/update-location.dto";
import { UsersService } from "../users/users.service";
import { RolesService } from "../roles/roles.service";
import { SystemRoleName } from "../roles/entities/role.entity";
import { User, UserStatus } from "../users/entities/user.entity";
import { AuthErrors, DeliveryPartnerErrors, SystemErrors } from "../../common/exceptions/business.exception";
import { hashPassword } from "../../common/utils/password.util";

/** Same lifecycle shape as Restaurant's — BLOCKED is terminal through these endpoints. */
const ALLOWED_TRANSITIONS: Record<DeliveryPartnerStatus, DeliveryPartnerStatus[]> = {
  [DeliveryPartnerStatus.PENDING]: [DeliveryPartnerStatus.APPROVED, DeliveryPartnerStatus.REJECTED],
  [DeliveryPartnerStatus.APPROVED]: [DeliveryPartnerStatus.SUSPENDED, DeliveryPartnerStatus.BLOCKED],
  [DeliveryPartnerStatus.REJECTED]: [DeliveryPartnerStatus.PENDING],
  [DeliveryPartnerStatus.SUSPENDED]: [DeliveryPartnerStatus.APPROVED, DeliveryPartnerStatus.BLOCKED],
  [DeliveryPartnerStatus.BLOCKED]: [],
};

@Injectable()
export class DeliveryPartnersService {
  constructor(
    @InjectRepository(DeliveryPartner) private readonly partnersRepository: Repository<DeliveryPartner>,
    @InjectRepository(DeliveryPartnerStatusHistory)
    private readonly statusHistoryRepository: Repository<DeliveryPartnerStatusHistory>,
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
    private readonly dataSource: DataSource,
  ) {}

  /** Creates the User (DELIVERY_PARTNER role) and its DeliveryPartner profile atomically — never leave one without the other. */
  async register(dto: RegisterDeliveryPartnerDto): Promise<{ partner: DeliveryPartner; user: User }> {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw AuthErrors.emailAlreadyRegistered();
    }

    const role = await this.rolesService.findByName(SystemRoleName.DELIVERY_PARTNER);
    if (!role) {
      throw SystemErrors.roleNotSeeded(SystemRoleName.DELIVERY_PARTNER);
    }

    return this.dataSource.transaction(async (manager) => {
      const passwordHash = await hashPassword(dto.password);
      const user = manager.create(User, {
        email: dto.email,
        passwordHash,
        phone: dto.phone,
        fullName: dto.fullName,
        roleId: role.id,
        status: UserStatus.ACTIVE,
      });
      await manager.save(user);

      const partner = manager.create(DeliveryPartner, {
        userId: user.id,
        vehicleType: dto.vehicleType,
        vehicleNumber: dto.vehicleNumber,
        licenseNumber: dto.licenseNumber,
        status: DeliveryPartnerStatus.PENDING,
      });
      await manager.save(partner);

      user.role = role;
      return { partner, user };
    });
  }

  async findByUserIdOrThrow(userId: string): Promise<DeliveryPartner> {
    const partner = await this.partnersRepository.findOne({ where: { userId }, relations: { user: true } });
    if (!partner) {
      throw new NotFoundException("Delivery partner profile not found");
    }
    return partner;
  }

  async findByIdOrThrow(id: string): Promise<DeliveryPartner> {
    const partner = await this.partnersRepository.findOne({ where: { id }, relations: { user: true } });
    if (!partner) {
      throw new NotFoundException("Delivery partner not found");
    }
    return partner;
  }

  findAll(status?: DeliveryPartnerStatus): Promise<DeliveryPartner[]> {
    return this.partnersRepository.find({
      where: status ? { status } : {},
      relations: { user: true },
      order: { createdAt: "DESC" },
    });
  }

  async updateOwnProfile(userId: string, dto: UpdateDeliveryPartnerDto): Promise<DeliveryPartner> {
    const partner = await this.findByUserIdOrThrow(userId);
    Object.assign(partner, dto);
    return this.partnersRepository.save(partner);
  }

  async setOnline(userId: string, isOnline: boolean): Promise<DeliveryPartner> {
    const partner = await this.findByUserIdOrThrow(userId);
    if (isOnline && partner.status !== DeliveryPartnerStatus.APPROVED) {
      throw DeliveryPartnerErrors.notApproved();
    }
    partner.isOnline = isOnline;
    return this.partnersRepository.save(partner);
  }

  async updateLocation(userId: string, dto: UpdateLocationDto): Promise<DeliveryPartner> {
    const partner = await this.findByUserIdOrThrow(userId);
    partner.currentLatitude = String(dto.latitude);
    partner.currentLongitude = String(dto.longitude);
    return this.partnersRepository.save(partner);
  }

  private async transitionStatus(
    partnerId: string,
    toStatus: DeliveryPartnerStatus,
    changedByUserId: string,
    reason: string | null,
  ): Promise<DeliveryPartner> {
    return this.dataSource.transaction(async (manager) => {
      const current = await manager.findOne(DeliveryPartner, { where: { id: partnerId } });
      if (!current) {
        throw new NotFoundException("Delivery partner not found");
      }

      const allowed = ALLOWED_TRANSITIONS[current.status] ?? [];
      if (!allowed.includes(toStatus)) {
        throw DeliveryPartnerErrors.invalidStatusTransition(current.status, toStatus);
      }

      const fromStatus = current.status;
      current.status = toStatus;
      current.rejectionReason = toStatus === DeliveryPartnerStatus.REJECTED ? reason : null;
      // Going offline is forced whenever the partner leaves APPROVED — they can't keep
      // accepting deliveries while suspended/blocked.
      if (toStatus !== DeliveryPartnerStatus.APPROVED) {
        current.isOnline = false;
      }
      await manager.save(current);

      const history = manager.create(DeliveryPartnerStatusHistory, {
        deliveryPartnerId: partnerId,
        fromStatus,
        toStatus,
        reason,
        changedByUserId,
      });
      await manager.save(history);

      return current;
    });
  }

  approve(id: string, changedByUserId: string): Promise<DeliveryPartner> {
    return this.transitionStatus(id, DeliveryPartnerStatus.APPROVED, changedByUserId, null);
  }

  reject(id: string, changedByUserId: string, reason: string): Promise<DeliveryPartner> {
    return this.transitionStatus(id, DeliveryPartnerStatus.REJECTED, changedByUserId, reason);
  }

  suspend(id: string, changedByUserId: string, reason: string): Promise<DeliveryPartner> {
    return this.transitionStatus(id, DeliveryPartnerStatus.SUSPENDED, changedByUserId, reason);
  }

  block(id: string, changedByUserId: string, reason: string): Promise<DeliveryPartner> {
    return this.transitionStatus(id, DeliveryPartnerStatus.BLOCKED, changedByUserId, reason);
  }

  reinstate(id: string, changedByUserId: string): Promise<DeliveryPartner> {
    return this.transitionStatus(id, DeliveryPartnerStatus.APPROVED, changedByUserId, null);
  }

  resubmit(id: string, changedByUserId: string): Promise<DeliveryPartner> {
    return this.transitionStatus(id, DeliveryPartnerStatus.PENDING, changedByUserId, null);
  }

  getStatusHistory(partnerId: string): Promise<DeliveryPartnerStatusHistory[]> {
    return this.statusHistoryRepository.find({ where: { deliveryPartnerId: partnerId }, order: { createdAt: "DESC" } });
  }
}
