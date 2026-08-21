import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, MoreThanOrEqual, QueryFailedError, Repository } from "typeorm";
import { Offer } from "./entities/offer.entity";
import { CreateOfferDto } from "./dto/create-offer.dto";
import { UpdateOfferDto } from "./dto/update-offer.dto";
import { OfferErrors } from "../../common/exceptions/business.exception";

const UNIQUE_VIOLATION = "23505";

@Injectable()
export class OffersService {
  constructor(@InjectRepository(Offer) private readonly repository: Repository<Offer>) {}

  async findActiveForStore(): Promise<Offer[]> {
    const now = new Date();
    return this.repository.find({
      where: [
        { isActive: true, expiresAt: IsNull() },
        { isActive: true, expiresAt: MoreThanOrEqual(now) },
      ],
      order: { createdAt: "DESC" },
    });
  }

  findAllForAdmin(): Promise<Offer[]> {
    return this.repository.find({ order: { createdAt: "DESC" } });
  }

  async findOneOrThrow(id: string): Promise<Offer> {
    const offer = await this.repository.findOne({ where: { id } });
    if (!offer) throw new NotFoundException("Offer not found");
    return offer;
  }

  async create(dto: CreateOfferDto): Promise<Offer> {
    const offer = this.repository.create({
      code: dto.code.toUpperCase(),
      title: dto.title,
      description: dto.description ?? null,
      discountType: dto.discountType,
      discountValue: String(dto.discountValue),
      minOrderAmount: dto.minOrderAmount !== undefined ? String(dto.minOrderAmount) : null,
      maxDiscountAmount: dto.maxDiscountAmount !== undefined ? String(dto.maxDiscountAmount) : null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      restaurantId: dto.restaurantId ?? null,
    });
    try {
      return await this.repository.save(offer);
    } catch (err) {
      throw this.mapDuplicateCode(err, offer.code);
    }
  }

  async update(id: string, dto: UpdateOfferDto): Promise<Offer> {
    const offer = await this.findOneOrThrow(id);
    Object.assign(offer, {
      ...dto,
      code: dto.code !== undefined ? dto.code.toUpperCase() : offer.code,
      discountValue: dto.discountValue !== undefined ? String(dto.discountValue) : offer.discountValue,
      minOrderAmount: dto.minOrderAmount !== undefined ? String(dto.minOrderAmount) : offer.minOrderAmount,
      maxDiscountAmount: dto.maxDiscountAmount !== undefined ? String(dto.maxDiscountAmount) : offer.maxDiscountAmount,
      expiresAt: dto.expiresAt !== undefined ? (dto.expiresAt ? new Date(dto.expiresAt) : null) : offer.expiresAt,
    });
    try {
      return await this.repository.save(offer);
    } catch (err) {
      throw this.mapDuplicateCode(err, offer.code);
    }
  }

  async remove(id: string): Promise<void> {
    const offer = await this.findOneOrThrow(id);
    await this.repository.remove(offer);
  }

  private mapDuplicateCode(err: unknown, code: string): unknown {
    if (err instanceof QueryFailedError && (err as unknown as { code?: string }).code === UNIQUE_VIOLATION) {
      return OfferErrors.codeTaken(code);
    }
    return err;
  }
}
