import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, QueryFailedError, Repository } from "typeorm";
import { CustomerProfile } from "./entities/customer-profile.entity";
import { User } from "../users/entities/user.entity";
import { UsersService } from "../users/users.service";
import { UpdateCustomerProfileDto } from "./dto/update-customer-profile.dto";
import { CustomerErrors } from "../../common/exceptions/business.exception";

/** Postgres unique_violation error code. */
const UNIQUE_VIOLATION = "23505";

export interface CustomerProfileView {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  profilePhoto: { originalFileName: string; mimeType: string } | null;
}

@Injectable()
export class CustomerProfileService {
  constructor(
    @InjectRepository(CustomerProfile) private readonly profilesRepository: Repository<CustomerProfile>,
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
  ) {}

  /** The profile row is created lazily — a customer who never edits anything never gets one. */
  async findOrCreateProfile(userId: string): Promise<CustomerProfile> {
    const existing = await this.profilesRepository.findOne({ where: { userId } });
    if (existing) return existing;
    const created = this.profilesRepository.create({ userId });
    return this.profilesRepository.save(created);
  }

  async getProfile(userId: string): Promise<CustomerProfileView> {
    const [user, profile] = await Promise.all([this.usersService.findById(userId), this.findOrCreateProfile(userId)]);
    return this.toView(user, profile);
  }

  async updateProfile(userId: string, dto: UpdateCustomerProfileDto): Promise<CustomerProfileView> {
    await this.findOrCreateProfile(userId); // ensure the row exists before the transaction touches it

    try {
      await this.dataSource.transaction(async (manager) => {
        if (dto.fullName !== undefined || dto.phone !== undefined) {
          await manager.update(User, userId, {
            ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
            ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
          });
        }
        if (dto.dateOfBirth !== undefined || dto.gender !== undefined) {
          await manager.update(CustomerProfile, { userId }, {
            ...(dto.dateOfBirth !== undefined ? { dateOfBirth: dto.dateOfBirth } : {}),
            ...(dto.gender !== undefined ? { gender: dto.gender } : {}),
          });
        }
      });
    } catch (err) {
      if (err instanceof QueryFailedError && (err as unknown as { code?: string }).code === UNIQUE_VIOLATION) {
        throw CustomerErrors.phoneTaken();
      }
      throw err;
    }

    return this.getProfile(userId);
  }

  private toView(user: User, profile: CustomerProfile): CustomerProfileView {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      dateOfBirth: profile.dateOfBirth,
      gender: profile.gender,
      profilePhoto: profile.profilePhotoPath
        ? { originalFileName: profile.profilePhotoOriginalName!, mimeType: profile.profilePhotoMimeType! }
        : null,
    };
  }
}
