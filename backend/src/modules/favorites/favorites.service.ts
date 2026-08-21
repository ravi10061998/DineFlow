import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { QueryFailedError, Repository } from "typeorm";
import { Favorite, FavoriteTargetType } from "./entities/favorite.entity";
import { CreateFavoriteDto } from "./dto/create-favorite.dto";
import { RestaurantsService } from "../restaurants/restaurants.service";
import { ProductsService } from "../products/products.service";

const UNIQUE_VIOLATION = "23505";

export interface FavoriteView {
  id: string;
  targetType: FavoriteTargetType;
  targetId: string;
  restaurant: { id: string; name: string; slug: string; city: string } | null;
  product: { id: string; name: string; basePrice: string; images: unknown[] } | null;
}

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite) private readonly repository: Repository<Favorite>,
    private readonly restaurantsService: RestaurantsService,
    private readonly productsService: ProductsService,
  ) {}

  async findAllForUser(userId: string): Promise<FavoriteView[]> {
    const favorites = await this.repository.find({ where: { userId }, order: { createdAt: "DESC" } });
    return Promise.all(favorites.map((favorite) => this.toView(favorite)));
  }

  async add(userId: string, dto: CreateFavoriteDto): Promise<FavoriteView> {
    // Confirm the target actually exists before saving — never favorite a dangling id.
    if (dto.targetType === FavoriteTargetType.RESTAURANT) {
      await this.restaurantsService.findByIdOrThrow(dto.targetId);
    } else {
      await this.productsService.findOneOrThrow(dto.targetId);
    }

    try {
      const favorite = this.repository.create({ userId, targetType: dto.targetType, targetId: dto.targetId });
      const saved = await this.repository.save(favorite);
      return this.toView(saved);
    } catch (err) {
      if (err instanceof QueryFailedError && (err as unknown as { code?: string }).code === UNIQUE_VIOLATION) {
        // Already favorited — idempotent, not an error (a heart-icon toggle can double-fire).
        const existing = await this.repository.findOne({ where: { userId, targetType: dto.targetType, targetId: dto.targetId } });
        return this.toView(existing!);
      }
      throw err;
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    const favorite = await this.repository.findOne({ where: { id, userId } });
    if (!favorite) {
      throw new NotFoundException("Favorite not found");
    }
    await this.repository.remove(favorite);
  }

  private async toView(favorite: Favorite): Promise<FavoriteView> {
    if (favorite.targetType === FavoriteTargetType.RESTAURANT) {
      const restaurant = await this.restaurantsService.findByIdOrThrow(favorite.targetId).catch(() => null);
      return {
        id: favorite.id,
        targetType: favorite.targetType,
        targetId: favorite.targetId,
        restaurant: restaurant ? { id: restaurant.id, name: restaurant.name, slug: restaurant.slug, city: restaurant.city } : null,
        product: null,
      };
    }
    const product = await this.productsService.findOneOrThrow(favorite.targetId).catch(() => null);
    return {
      id: favorite.id,
      targetType: favorite.targetType,
      targetId: favorite.targetId,
      restaurant: null,
      product: product ? { id: product.id, name: product.name, basePrice: product.basePrice, images: product.images } : null,
    };
  }
}
