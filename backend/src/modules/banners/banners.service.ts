import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, LessThanOrEqual, MoreThanOrEqual, Repository } from "typeorm";
import { Banner } from "./entities/banner.entity";
import { CreateBannerDto } from "./dto/create-banner.dto";
import { UpdateBannerDto } from "./dto/update-banner.dto";

@Injectable()
export class BannersService {
  constructor(@InjectRepository(Banner) private readonly repository: Repository<Banner>) {}

  /** "Currently eligible" = is_active AND (no startDate or startDate <= now) AND (no endDate or endDate >= now) — same bound-matrix pattern as Module 5's active-commission-override lookup. */
  async findActiveForStore(): Promise<Banner[]> {
    const now = new Date();
    const candidates = await this.repository.find({
      where: [
        { isActive: true, startDate: IsNull(), endDate: IsNull() },
        { isActive: true, startDate: LessThanOrEqual(now), endDate: IsNull() },
        { isActive: true, startDate: IsNull(), endDate: MoreThanOrEqual(now) },
        { isActive: true, startDate: LessThanOrEqual(now), endDate: MoreThanOrEqual(now) },
      ],
      order: { sortOrder: "ASC" },
    });
    return candidates;
  }

  findAllForAdmin(): Promise<Banner[]> {
    return this.repository.find({ order: { sortOrder: "ASC" } });
  }

  async findOneOrThrow(id: string): Promise<Banner> {
    const banner = await this.repository.findOne({ where: { id } });
    if (!banner) throw new NotFoundException("Banner not found");
    return banner;
  }

  async create(dto: CreateBannerDto): Promise<Banner> {
    const banner = this.repository.create({
      title: dto.title,
      subtitle: dto.subtitle ?? null,
      imageUrl: dto.imageUrl,
      ctaLabel: dto.ctaLabel ?? null,
      ctaUrl: dto.ctaUrl ?? null,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      sortOrder: dto.sortOrder ?? (await this.repository.count()),
    });
    return this.repository.save(banner);
  }

  async update(id: string, dto: UpdateBannerDto): Promise<Banner> {
    const banner = await this.findOneOrThrow(id);
    Object.assign(banner, {
      ...dto,
      startDate: dto.startDate !== undefined ? (dto.startDate ? new Date(dto.startDate) : null) : banner.startDate,
      endDate: dto.endDate !== undefined ? (dto.endDate ? new Date(dto.endDate) : null) : banner.endDate,
    });
    return this.repository.save(banner);
  }

  async remove(id: string): Promise<void> {
    const banner = await this.findOneOrThrow(id);
    await this.repository.remove(banner);
  }
}
