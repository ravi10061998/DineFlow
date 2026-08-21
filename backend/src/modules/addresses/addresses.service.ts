import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { CustomerAddress } from "./entities/customer-address.entity";
import { CreateAddressDto } from "./dto/create-address.dto";
import { UpdateAddressDto } from "./dto/update-address.dto";
import { AddressErrors } from "../../common/exceptions/business.exception";

/** Soft cap — guards against unbounded growth, not a real product constraint. */
const MAX_ADDRESSES_PER_CUSTOMER = 20;

@Injectable()
export class AddressesService {
  constructor(
    @InjectRepository(CustomerAddress) private readonly addressesRepository: Repository<CustomerAddress>,
    private readonly dataSource: DataSource,
  ) {}

  findAllForUser(userId: string): Promise<CustomerAddress[]> {
    return this.addressesRepository.find({ where: { userId }, order: { isDefault: "DESC", createdAt: "ASC" } });
  }

  async findOneOrThrow(id: string, userId: string): Promise<CustomerAddress> {
    const address = await this.addressesRepository.findOne({ where: { id, userId } });
    if (!address) {
      throw new NotFoundException("Address not found");
    }
    return address;
  }

  async create(userId: string, dto: CreateAddressDto): Promise<CustomerAddress> {
    const count = await this.addressesRepository.count({ where: { userId } });
    if (count >= MAX_ADDRESSES_PER_CUSTOMER) {
      throw AddressErrors.limitReached(MAX_ADDRESSES_PER_CUSTOMER);
    }

    // The first address a customer ever saves is always the default, regardless of what was sent —
    // there should never be a "no default" state right after someone adds their first address.
    const makeDefault = count === 0 || dto.isDefault === true;
    const fields = this.mapDto(dto);

    if (!makeDefault) {
      const address = this.addressesRepository.create({ ...fields, userId, isDefault: false });
      return this.addressesRepository.save(address);
    }

    return this.dataSource.transaction(async (manager) => {
      await manager.update(CustomerAddress, { userId }, { isDefault: false });
      const address = manager.create(CustomerAddress, { ...fields, userId, isDefault: true });
      return manager.save(address);
    });
  }

  async update(id: string, userId: string, dto: UpdateAddressDto): Promise<CustomerAddress> {
    const address = await this.findOneOrThrow(id, userId);
    const fields = this.mapDto(dto);
    const makeDefault = dto.isDefault === true && !address.isDefault;

    if (!makeDefault) {
      Object.assign(address, fields);
      return this.addressesRepository.save(address);
    }

    return this.dataSource.transaction(async (manager) => {
      await manager.update(CustomerAddress, { userId }, { isDefault: false });
      Object.assign(address, fields, { isDefault: true });
      return manager.save(address);
    });
  }

  /** Explicitly promote an address to default — equivalent to PATCH { isDefault: true } but reads clearer as its own action. */
  async setDefault(id: string, userId: string): Promise<CustomerAddress> {
    const address = await this.findOneOrThrow(id, userId);
    if (address.isDefault) {
      return address;
    }
    await this.dataSource.transaction(async (manager) => {
      await manager.update(CustomerAddress, { userId }, { isDefault: false });
      await manager.update(CustomerAddress, { id, userId }, { isDefault: true });
    });
    address.isDefault = true;
    return address;
  }

  async remove(id: string, userId: string): Promise<void> {
    const address = await this.findOneOrThrow(id, userId);

    if (!address.isDefault) {
      await this.addressesRepository.remove(address);
      return;
    }

    // Deleting the default address auto-promotes the oldest remaining one, if any —
    // otherwise a customer could silently end up with zero default addresses.
    await this.dataSource.transaction(async (manager) => {
      await manager.remove(address);
      const [oldestRemaining] = await manager.find(CustomerAddress, {
        where: { userId },
        order: { createdAt: "ASC" },
        take: 1,
      });
      if (oldestRemaining) {
        await manager.update(CustomerAddress, { id: oldestRemaining.id }, { isDefault: true });
      }
    });
  }

  private mapDto(dto: CreateAddressDto | UpdateAddressDto) {
    const { isDefault: _isDefault, latitude, longitude, ...rest } = dto;
    return {
      ...rest,
      ...(latitude !== undefined ? { latitude: String(latitude) } : {}),
      ...(longitude !== undefined ? { longitude: String(longitude) } : {}),
    };
  }
}
