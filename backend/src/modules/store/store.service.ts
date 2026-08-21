import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Restaurant, RestaurantStatus } from "../restaurants/entities/restaurant.entity";
import { Product } from "../products/entities/product.entity";
import { Order } from "../orders/entities/order.entity";
import { OrderItem } from "../orders/entities/order-item.entity";
import { BannersService } from "../banners/banners.service";
import { FoodCategoriesService } from "../food-categories/food-categories.service";
import { OffersService } from "../offers/offers.service";
import { BlogsService } from "../blogs/blogs.service";

const DEFAULT_LIMIT = 10;
const TRENDING_WINDOW_DAYS = 30;

export interface RestaurantSummary {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  status: RestaurantStatus;
  isFeatured: boolean;
  distanceKm?: number;
}

export interface ProductSummary {
  id: string;
  name: string;
  basePrice: string;
  images: unknown[];
  restaurantId: string;
  restaurantName: string;
  orderCount: number;
}

@Injectable()
export class StoreService {
  constructor(
    @InjectRepository(Restaurant) private readonly restaurantsRepository: Repository<Restaurant>,
    @InjectRepository(Product) private readonly productsRepository: Repository<Product>,
    @InjectRepository(Order) private readonly ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem) private readonly orderItemsRepository: Repository<OrderItem>,
    private readonly bannersService: BannersService,
    private readonly foodCategoriesService: FoodCategoriesService,
    private readonly offersService: OffersService,
    private readonly blogsService: BlogsService,
  ) {}

  async getHome() {
    const [banners, categories, featuredRestaurants, popularRestaurants, popularProducts, trendingProducts, offers, blogs] =
      await Promise.all([
        this.bannersService.findActiveForStore(),
        this.foodCategoriesService.findActiveForStore(),
        this.getFeaturedRestaurants(),
        this.getPopularRestaurants(),
        this.getPopularProducts(),
        this.getTrendingProducts(),
        this.offersService.findActiveForStore(),
        this.blogsService.findPublished(1),
      ]);
    return { banners, categories, featuredRestaurants, popularRestaurants, popularProducts, trendingProducts, offers, blogs: blogs.items };
  }

  async getFeaturedRestaurants(): Promise<Restaurant[]> {
    return this.restaurantsRepository.find({
      where: { status: RestaurantStatus.APPROVED, isFeatured: true },
      take: DEFAULT_LIMIT,
      order: { createdAt: "DESC" },
    });
  }

  /** Ranked by real order volume — there's no rating/review data yet (Reviews module isn't built), so this never fabricates a star rating. */
  async getPopularRestaurants(): Promise<RestaurantSummary[]> {
    const rows = await this.ordersRepository
      .createQueryBuilder("order")
      .select("order.restaurant_id", "restaurantId")
      .addSelect("COUNT(*)", "orderCount")
      .groupBy("order.restaurant_id")
      .orderBy("COUNT(*)", "DESC")
      .limit(DEFAULT_LIMIT)
      .getRawMany<{ restaurantId: string; orderCount: string }>();

    return this.hydrateRestaurants(rows.map((r) => r.restaurantId));
  }

  /** Rule-based, per spec: restaurants this customer has actually ordered from before, ranked by how often. Falls back to Popular for a customer with no history. */
  async getRecommendedRestaurants(customerId: string): Promise<RestaurantSummary[]> {
    const rows = await this.ordersRepository
      .createQueryBuilder("order")
      .select("order.restaurant_id", "restaurantId")
      .addSelect("COUNT(*)", "orderCount")
      .where("order.customer_id = :customerId", { customerId })
      .groupBy("order.restaurant_id")
      .orderBy("COUNT(*)", "DESC")
      .limit(DEFAULT_LIMIT)
      .getRawMany<{ restaurantId: string; orderCount: string }>();

    if (rows.length === 0) {
      return this.getPopularRestaurants();
    }
    return this.hydrateRestaurants(rows.map((r) => r.restaurantId));
  }

  /** Distance computed server-side (Haversine) — a restaurant only appears if the customer's point actually falls within its own delivery radius. */
  async getNearbyRestaurants(lat: number, lng: number): Promise<RestaurantSummary[]> {
    const candidates = await this.restaurantsRepository.find({
      where: { status: RestaurantStatus.APPROVED },
    });

    return candidates
      .filter((r) => r.latitude !== null && r.longitude !== null)
      .map((r) => ({ restaurant: r, distanceKm: this.haversineKm(lat, lng, Number(r.latitude), Number(r.longitude)) }))
      .filter(({ restaurant, distanceKm }) => distanceKm <= Number(restaurant.deliveryRadiusKm))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, DEFAULT_LIMIT)
      .map(({ restaurant, distanceKm }) => ({ ...this.toRestaurantSummary(restaurant), distanceKm: Math.round(distanceKm * 10) / 10 }));
  }

  async getPopularProducts(): Promise<ProductSummary[]> {
    return this.rankProducts();
  }

  async getTrendingProducts(): Promise<ProductSummary[]> {
    const since = new Date();
    since.setDate(since.getDate() - TRENDING_WINDOW_DAYS);
    return this.rankProducts(since);
  }

  /** Distinct products from this customer's past orders, most recent first — "Order Again" re-adds via the real Cart API, which re-validates availability/price itself. */
  async getRecentlyOrdered(customerId: string): Promise<ProductSummary[]> {
    const rows = await this.orderItemsRepository
      .createQueryBuilder("item")
      .innerJoin("item.order", "order")
      .where("order.customer_id = :customerId", { customerId })
      .andWhere("item.product_id IS NOT NULL")
      .select("item.product_id", "productId")
      .addSelect("MAX(order.created_at)", "lastOrderedAt")
      .groupBy("item.product_id")
      .orderBy("MAX(order.created_at)", "DESC")
      .limit(DEFAULT_LIMIT)
      .getRawMany<{ productId: string; lastOrderedAt: string }>();

    if (rows.length === 0) return []; // an empty `where` array below would otherwise match every product

    const products = await this.productsRepository.find({
      where: rows.map((r) => ({ id: r.productId })),
      relations: { restaurant: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    return rows
      .map((r) => byId.get(r.productId))
      .filter((p): p is Product => !!p)
      .map((p) => this.toProductSummary(p, 0));
  }

  async search(query: string) {
    const like = `%${query.toLowerCase()}%`;
    const [restaurants, products, categories] = await Promise.all([
      this.restaurantsRepository
        .createQueryBuilder("r")
        .where("r.status = :status", { status: RestaurantStatus.APPROVED })
        .andWhere("LOWER(r.name) LIKE :like", { like })
        .limit(DEFAULT_LIMIT)
        .getMany(),
      this.productsRepository
        .createQueryBuilder("p")
        .leftJoinAndSelect("p.restaurant", "restaurant")
        .where("p.is_active = true")
        .andWhere("LOWER(p.name) LIKE :like", { like })
        .limit(DEFAULT_LIMIT)
        .getMany(),
      this.foodCategoriesService.findActiveForStore().then((all) => all.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))),
    ]);
    return {
      restaurants: restaurants.map((r) => this.toRestaurantSummary(r)),
      products: products.map((p) => this.toProductSummary(p, 0)),
      categories,
    };
  }

  private async rankProducts(since?: Date): Promise<ProductSummary[]> {
    const qb = this.orderItemsRepository
      .createQueryBuilder("item")
      .innerJoin("item.order", "order")
      .where("item.product_id IS NOT NULL")
      .select("item.product_id", "productId")
      .addSelect("SUM(item.quantity)", "orderCount")
      .groupBy("item.product_id")
      .orderBy("SUM(item.quantity)", "DESC")
      .limit(DEFAULT_LIMIT);
    if (since) {
      qb.andWhere("order.created_at >= :since", { since });
    }
    const rows = await qb.getRawMany<{ productId: string; orderCount: string }>();
    if (rows.length === 0) return []; // an empty `where` array below would otherwise match every product

    const products = await this.productsRepository.find({
      where: rows.map((r) => ({ id: r.productId })),
      relations: { restaurant: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    const countById = new Map(rows.map((r) => [r.productId, Number(r.orderCount)]));
    return rows
      .map((r) => byId.get(r.productId))
      .filter((p): p is Product => !!p && p.isActive)
      .map((p) => this.toProductSummary(p, countById.get(p.id) ?? 0));
  }

  private async hydrateRestaurants(ids: string[]): Promise<RestaurantSummary[]> {
    if (ids.length === 0) return [];
    const restaurants = await this.restaurantsRepository.find({ where: ids.map((id) => ({ id, status: RestaurantStatus.APPROVED })) });
    const byId = new Map(restaurants.map((r) => [r.id, r]));
    return ids
      .map((id) => byId.get(id))
      .filter((r): r is Restaurant => !!r)
      .map((r) => this.toRestaurantSummary(r));
  }

  private toRestaurantSummary(r: Restaurant): RestaurantSummary {
    return { id: r.id, name: r.name, slug: r.slug, city: r.city, state: r.state, status: r.status, isFeatured: r.isFeatured };
  }

  private toProductSummary(p: Product, orderCount: number): ProductSummary {
    return {
      id: p.id,
      name: p.name,
      basePrice: p.basePrice,
      images: p.images,
      restaurantId: p.restaurantId,
      restaurantName: p.restaurant?.name ?? "",
      orderCount,
    };
  }

  /** Great-circle distance in km between two lat/long points. */
  private haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }
}
