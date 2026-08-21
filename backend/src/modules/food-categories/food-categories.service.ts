import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { QueryFailedError, Repository } from "typeorm";
import { FoodCategory } from "./entities/food-category.entity";
import { CreateFoodCategoryDto } from "./dto/create-food-category.dto";
import { UpdateFoodCategoryDto } from "./dto/update-food-category.dto";
import { FoodCategoryErrors } from "../../common/exceptions/business.exception";

const UNIQUE_VIOLATION = "23505";

@Injectable()
export class FoodCategoriesService {
  constructor(@InjectRepository(FoodCategory) private readonly repository: Repository<FoodCategory>) {}

  findActiveForStore(): Promise<FoodCategory[]> {
    return this.repository.find({ where: { isActive: true }, order: { sortOrder: "ASC" } });
  }

  findAllForAdmin(): Promise<FoodCategory[]> {
    return this.repository.find({ order: { sortOrder: "ASC" } });
  }

  async findOneOrThrow(id: string): Promise<FoodCategory> {
    const category = await this.repository.findOne({ where: { id } });
    if (!category) throw new NotFoundException("Food category not found");
    return category;
  }

  async findBySlugOrThrow(slug: string): Promise<FoodCategory> {
    const category = await this.repository.findOne({ where: { slug, isActive: true } });
    if (!category) throw new NotFoundException("Food category not found");
    return category;
  }

  async create(dto: CreateFoodCategoryDto): Promise<FoodCategory> {
    const category = this.repository.create({
      name: dto.name,
      slug: dto.slug,
      imageUrl: dto.imageUrl ?? null,
      sortOrder: dto.sortOrder ?? (await this.repository.count()),
    });
    try {
      return await this.repository.save(category);
    } catch (err) {
      throw this.mapDuplicateSlug(err, dto.slug);
    }
  }

  async update(id: string, dto: UpdateFoodCategoryDto): Promise<FoodCategory> {
    const category = await this.findOneOrThrow(id);
    Object.assign(category, dto);
    try {
      return await this.repository.save(category);
    } catch (err) {
      throw this.mapDuplicateSlug(err, dto.slug ?? category.slug);
    }
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOneOrThrow(id);
    await this.repository.remove(category);
  }

  private mapDuplicateSlug(err: unknown, slug: string): unknown {
    if (err instanceof QueryFailedError && (err as unknown as { code?: string }).code === UNIQUE_VIOLATION) {
      return FoodCategoryErrors.slugTaken(slug);
    }
    return err;
  }
}
