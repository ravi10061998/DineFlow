import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { QueryFailedError, Repository } from "typeorm";
import { Review } from "./entities/review.entity";
import { Order, OrderStatus } from "../orders/entities/order.entity";
import { CreateReviewDto } from "./dto/create-review.dto";
import { UpdateReviewDto } from "./dto/update-review.dto";
import { RespondReviewDto } from "./dto/respond-review.dto";
import { ReviewErrors } from "../../common/exceptions/business.exception";

const UNIQUE_VIOLATION = "23505";
const PUBLIC_LIST_LIMIT = 50;

export interface RatingSummary {
  avgRating: number | null;
  reviewCount: number;
}

const NO_RATING: RatingSummary = { avgRating: null, reviewCount: 0 };

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review) private readonly reviewsRepository: Repository<Review>,
    // Read-only lookup — the same "inject the repository directly rather than growing another
    // module's service with a reviews-specific method" pattern StoreModule already established.
    @InjectRepository(Order) private readonly ordersRepository: Repository<Order>,
  ) {}

  async createForOrder(customerId: string, dto: CreateReviewDto): Promise<Review> {
    const order = await this.ordersRepository.findOne({ where: { id: dto.orderId, customerId } });
    if (!order) throw new NotFoundException("Order not found");
    if (order.status !== OrderStatus.DELIVERED) throw ReviewErrors.orderNotDelivered();

    const review = this.reviewsRepository.create({
      orderId: order.id,
      customerId,
      restaurantId: order.restaurantId,
      rating: dto.rating,
      comment: dto.comment ?? null,
    });
    try {
      return await this.reviewsRepository.save(review);
    } catch (err) {
      if (err instanceof QueryFailedError && (err as unknown as { code?: string }).code === UNIQUE_VIOLATION) {
        throw ReviewErrors.alreadyReviewed();
      }
      throw err;
    }
  }

  async updateOwn(customerId: string, id: string, dto: UpdateReviewDto): Promise<Review> {
    const review = await this.reviewsRepository.findOne({ where: { id, customerId } });
    if (!review) throw new NotFoundException("Review not found");
    if (dto.rating !== undefined) review.rating = dto.rating;
    if (dto.comment !== undefined) review.comment = dto.comment;
    return this.reviewsRepository.save(review);
  }

  /**
   * Returns the same `{..., customer: {id, fullName}}` shape as `findForRestaurantSelf` — the
   * frontend merges this response straight into its already-loaded list, so a shape mismatch here
   * would silently drop the customer's name from that row after responding.
   */
  async respondAsRestaurant(restaurantId: string, id: string, dto: RespondReviewDto) {
    const review = await this.reviewsRepository.findOne({ where: { id, restaurantId }, relations: { customer: true } });
    if (!review) throw new NotFoundException("Review not found");
    review.restaurantResponse = dto.response;
    review.restaurantRespondedAt = new Date();
    const saved = await this.reviewsRepository.save(review);
    return {
      id: saved.id,
      orderId: saved.orderId,
      rating: saved.rating,
      comment: saved.comment,
      restaurantResponse: saved.restaurantResponse,
      restaurantRespondedAt: saved.restaurantRespondedAt,
      createdAt: saved.createdAt,
      customer: { id: saved.customer.id, fullName: saved.customer.fullName },
    };
  }

  findOwnForCustomer(customerId: string): Promise<Review[]> {
    return this.reviewsRepository.find({ where: { customerId }, order: { createdAt: "DESC" } });
  }

  /** Same customer-field-minimization as the public list — a restaurant needs the reviewer's name to respond meaningfully, not their email/phone. */
  async findForRestaurantSelf(restaurantId: string) {
    const reviews = await this.reviewsRepository.find({ where: { restaurantId }, order: { createdAt: "DESC" }, relations: { customer: true } });
    return reviews.map((r) => ({
      id: r.id,
      orderId: r.orderId,
      rating: r.rating,
      comment: r.comment,
      restaurantResponse: r.restaurantResponse,
      restaurantRespondedAt: r.restaurantRespondedAt,
      createdAt: r.createdAt,
      customer: { id: r.customer.id, fullName: r.customer.fullName },
    }));
  }

  /**
   * Public — powers the menu page's review list. Capped rather than fully paginated; an MVP-scale
   * list. Deliberately maps the customer relation down to `{id, fullName}` rather than returning
   * the raw entity — `User.passwordHash` is `select:false` so that never leaks, but email/phone
   * would otherwise be exposed to anonymous visitors, which a public review list must never do.
   */
  async findForRestaurantPublic(restaurantId: string) {
    const reviews = await this.reviewsRepository.find({
      where: { restaurantId },
      order: { createdAt: "DESC" },
      take: PUBLIC_LIST_LIMIT,
      relations: { customer: true },
    });
    return reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      restaurantResponse: r.restaurantResponse,
      restaurantRespondedAt: r.restaurantRespondedAt,
      createdAt: r.createdAt,
      customer: { id: r.customer.id, fullName: r.customer.fullName },
    }));
  }

  findAllForAdmin(): Promise<Review[]> {
    return this.reviewsRepository.find({ order: { createdAt: "DESC" }, relations: { customer: true, restaurant: true } });
  }

  async removeAsAdmin(id: string): Promise<void> {
    const review = await this.reviewsRepository.findOne({ where: { id } });
    if (!review) throw new NotFoundException("Review not found");
    await this.reviewsRepository.remove(review);
  }

  async getSummary(restaurantId: string): Promise<RatingSummary> {
    const summaries = await this.getSummaries([restaurantId]);
    return summaries.get(restaurantId) ?? NO_RATING;
  }

  /** One grouped query for many restaurants at once — every restaurant-listing surface (Store, public browse) needs this in bulk, never N+1. */
  async getSummaries(restaurantIds: string[]): Promise<Map<string, RatingSummary>> {
    const map = new Map<string, RatingSummary>();
    if (restaurantIds.length === 0) return map;

    const rows = await this.reviewsRepository
      .createQueryBuilder("review")
      .select("review.restaurant_id", "restaurantId")
      .addSelect("AVG(review.rating)", "avgRating")
      .addSelect("COUNT(*)", "reviewCount")
      .where("review.restaurant_id IN (:...restaurantIds)", { restaurantIds })
      .groupBy("review.restaurant_id")
      .getRawMany<{ restaurantId: string; avgRating: string; reviewCount: string }>();

    for (const row of rows) {
      map.set(row.restaurantId, { avgRating: Math.round(Number(row.avgRating) * 10) / 10, reviewCount: Number(row.reviewCount) });
    }
    return map;
  }
}
