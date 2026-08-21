import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { QueryFailedError } from "typeorm";
import { Category } from "./entities/category.entity";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { CategoryErrors } from "../../common/exceptions/business.exception";

/** Postgres unique_violation error code. */
const UNIQUE_VIOLATION = "23505";

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category) private readonly categoriesRepository: Repository<Category>,
    private readonly dataSource: DataSource,
  ) {}

  findAllForRestaurant(restaurantId: string): Promise<Category[]> {
    return this.categoriesRepository.find({ where: { restaurantId }, order: { sortOrder: "ASC" } });
  }

  async findOneOrThrow(id: string, restaurantId?: string): Promise<Category> {
    const category = await this.categoriesRepository.findOne({
      where: restaurantId ? { id, restaurantId } : { id },
    });
    if (!category) {
      throw new NotFoundException("Category not found");
    }
    return category;
  }

  async create(restaurantId: string, dto: CreateCategoryDto): Promise<Category> {
    const category = this.categoriesRepository.create({
      restaurantId,
      name: dto.name,
      description: dto.description ?? null,
      sortOrder: dto.sortOrder ?? (await this.nextSortOrder(restaurantId)),
    });
    try {
      return await this.categoriesRepository.save(category);
    } catch (err) {
      throw this.mapDuplicateNameError(err, dto.name);
    }
  }

  async update(id: string, restaurantId: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findOneOrThrow(id, restaurantId);
    Object.assign(category, dto);
    try {
      return await this.categoriesRepository.save(category);
    } catch (err) {
      throw this.mapDuplicateNameError(err, dto.name ?? category.name);
    }
  }

  async remove(id: string, restaurantId: string): Promise<void> {
    const category = await this.findOneOrThrow(id, restaurantId);
    // No `products` table until Module 7 — this is a structural no-op today,
    // but the guard (and its error code) exists now so Module 7 only has to
    // add the COUNT query, not revisit every caller of this method.
    const productCount = await this.countProductsInCategory(id);
    if (productCount > 0) {
      throw CategoryErrors.inUse();
    }
    await this.categoriesRepository.remove(category);
  }

  async reorder(restaurantId: string, orderedIds: string[]): Promise<Category[]> {
    return this.dataSource.transaction(async (manager) => {
      const categories = await manager.find(Category, { where: { restaurantId } });
      const validIds = new Set(categories.map((c) => c.id));
      const isExactMatch = orderedIds.length === validIds.size && orderedIds.every((id) => validIds.has(id));
      if (!isExactMatch) {
        throw CategoryErrors.reorderInvalid();
      }

      await Promise.all(
        orderedIds.map((id, index) => manager.update(Category, { id, restaurantId }, { sortOrder: index })),
      );

      return manager.find(Category, { where: { restaurantId }, order: { sortOrder: "ASC" } });
    });
  }

  private async nextSortOrder(restaurantId: string): Promise<number> {
    const count = await this.categoriesRepository.count({ where: { restaurantId } });
    return count;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async countProductsInCategory(_categoryId: string): Promise<number> {
    return 0; // Replace with a real COUNT against `products` once Module 7 exists.
  }

  private mapDuplicateNameError(err: unknown, name: string): unknown {
    if (err instanceof QueryFailedError && (err as unknown as { code?: string }).code === UNIQUE_VIOLATION) {
      return CategoryErrors.nameTaken(name);
    }
    return err;
  }
}
