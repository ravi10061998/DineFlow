import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Order, OrderStatus } from "../orders/entities/order.entity";
import { OrderItem } from "../orders/entities/order-item.entity";
import { ReviewsService } from "../reviews/reviews.service";
import { resolvePeriod } from "../../common/utils/period.util";

const DEFAULT_TOP_LIMIT = 10;

/**
 * Purely computed from existing tables — no new schema, per the note left in
 * `admin-dashboard.controller.ts` since Module 5 ("this endpoint should grow
 * incrementally ... rather than becoming a dedicated Analytics module
 * prematurely"). Now that Orders/Payments/Ledger/Reviews/Coupons all exist,
 * that premature-ness has passed; this module is the real thing, and
 * `/admin/dashboard/summary` is left as-is (restaurant/subscription counts —
 * a different, simpler concern this module doesn't need to absorb).
 */
@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Order) private readonly ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem) private readonly orderItemsRepository: Repository<OrderItem>,
    private readonly reviewsService: ReviewsService,
  ) {}

  // --- Platform-wide (admin) ------------------------------------------------

  async getAdminOverview(period?: string) {
    const { label, since } = resolvePeriod(period);

    const qb = this.ordersRepository
      .createQueryBuilder("order")
      .where("order.status != :cancelled", { cancelled: OrderStatus.CANCELLED });
    if (since) qb.andWhere("order.created_at >= :since", { since });

    const row = await qb
      .select("COUNT(*)", "totalOrders")
      .addSelect("COALESCE(SUM(order.total_amount), 0)", "gmv")
      .addSelect("COALESCE(SUM(order.commission_amount), 0)", "commissionEarned")
      .addSelect("COALESCE(SUM(order.discount_amount), 0)", "totalDiscountGiven")
      .addSelect("COUNT(DISTINCT order.customer_id)", "activeCustomers")
      .getRawOne<{ totalOrders: string; gmv: string; commissionEarned: string; totalDiscountGiven: string; activeCustomers: string }>();

    const totalOrders = Number(row?.totalOrders ?? 0);
    const gmv = Number(row?.gmv ?? 0);
    const platformRating = await this.reviewsService.getPlatformSummary();

    return {
      period: label,
      totalOrders,
      gmv: gmv.toFixed(2),
      commissionEarned: Number(row?.commissionEarned ?? 0).toFixed(2),
      totalDiscountGiven: Number(row?.totalDiscountGiven ?? 0).toFixed(2),
      avgOrderValue: (totalOrders > 0 ? gmv / totalOrders : 0).toFixed(2),
      activeCustomers: Number(row?.activeCustomers ?? 0),
      platformAvgRating: platformRating.avgRating,
      platformReviewCount: platformRating.reviewCount,
    };
  }

  async getAdminRevenueTimeSeries(period?: string) {
    const { since } = resolvePeriod(period);
    const qb = this.ordersRepository
      .createQueryBuilder("order")
      .where("order.status != :cancelled", { cancelled: OrderStatus.CANCELLED });
    if (since) qb.andWhere("order.created_at >= :since", { since });

    // TO_CHAR, not DATE() — a bare DATE() cast comes back from node-pg as a parsed JS Date object
    // (at UTC midnight), which then serializes to a full ISO timestamp, not the plain "YYYY-MM-DD"
    // string a raw aggregate row is supposed to be. TO_CHAR always returns text, sidestepping that.
    const rows = await qb
      .select("TO_CHAR(order.created_at, 'YYYY-MM-DD')", "date")
      .addSelect("COUNT(*)", "orderCount")
      .addSelect("COALESCE(SUM(order.total_amount), 0)", "gmv")
      .addSelect("COALESCE(SUM(order.commission_amount), 0)", "commissionEarned")
      .groupBy("TO_CHAR(order.created_at, 'YYYY-MM-DD')")
      .orderBy("TO_CHAR(order.created_at, 'YYYY-MM-DD')", "ASC")
      .getRawMany<{ date: string; orderCount: string; gmv: string; commissionEarned: string }>();

    return rows.map((r) => ({
      date: r.date,
      orderCount: Number(r.orderCount),
      gmv: Number(r.gmv).toFixed(2),
      commissionEarned: Number(r.commissionEarned).toFixed(2),
    }));
  }

  async getTopRestaurants(period?: string, limit = DEFAULT_TOP_LIMIT) {
    const { since } = resolvePeriod(period);
    const qb = this.ordersRepository
      .createQueryBuilder("order")
      .innerJoin("order.restaurant", "restaurant")
      .where("order.status != :cancelled", { cancelled: OrderStatus.CANCELLED });
    if (since) qb.andWhere("order.created_at >= :since", { since });

    const rows = await qb
      .select("order.restaurant_id", "restaurantId")
      .addSelect("restaurant.name", "restaurantName")
      .addSelect("COUNT(*)", "orderCount")
      .addSelect("COALESCE(SUM(order.total_amount), 0)", "gmv")
      .groupBy("order.restaurant_id")
      .addGroupBy("restaurant.name")
      .orderBy("SUM(order.total_amount)", "DESC")
      .limit(limit)
      .getRawMany<{ restaurantId: string; restaurantName: string; orderCount: string; gmv: string }>();

    return rows.map((r) => ({ restaurantId: r.restaurantId, restaurantName: r.restaurantName, orderCount: Number(r.orderCount), gmv: Number(r.gmv).toFixed(2) }));
  }

  async getTopProducts(period?: string, limit = DEFAULT_TOP_LIMIT) {
    return this.topProducts(undefined, period, limit);
  }

  // --- Restaurant-scoped ------------------------------------------------------

  async getRestaurantOverview(restaurantId: string, period?: string) {
    const { label, since } = resolvePeriod(period);
    const qb = this.ordersRepository
      .createQueryBuilder("order")
      .where("order.restaurant_id = :restaurantId", { restaurantId })
      .andWhere("order.status != :cancelled", { cancelled: OrderStatus.CANCELLED });
    if (since) qb.andWhere("order.created_at >= :since", { since });

    const row = await qb
      .select("COUNT(*)", "totalOrders")
      .addSelect("COALESCE(SUM(order.subtotal), 0)", "revenue")
      .addSelect("COALESCE(SUM(order.restaurant_payout_amount), 0)", "payout")
      .getRawOne<{ totalOrders: string; revenue: string; payout: string }>();

    const totalOrders = Number(row?.totalOrders ?? 0);
    const revenue = Number(row?.revenue ?? 0);
    const rating = await this.reviewsService.getSummary(restaurantId);

    return {
      period: label,
      totalOrders,
      revenue: revenue.toFixed(2),
      payout: Number(row?.payout ?? 0).toFixed(2),
      avgOrderValue: (totalOrders > 0 ? revenue / totalOrders : 0).toFixed(2),
      avgRating: rating.avgRating,
      reviewCount: rating.reviewCount,
    };
  }

  async getRestaurantRevenueTimeSeries(restaurantId: string, period?: string) {
    const { since } = resolvePeriod(period);
    const qb = this.ordersRepository
      .createQueryBuilder("order")
      .where("order.restaurant_id = :restaurantId", { restaurantId })
      .andWhere("order.status != :cancelled", { cancelled: OrderStatus.CANCELLED });
    if (since) qb.andWhere("order.created_at >= :since", { since });

    const rows = await qb
      .select("TO_CHAR(order.created_at, 'YYYY-MM-DD')", "date")
      .addSelect("COUNT(*)", "orderCount")
      .addSelect("COALESCE(SUM(order.subtotal), 0)", "revenue")
      .addSelect("COALESCE(SUM(order.restaurant_payout_amount), 0)", "payout")
      .groupBy("TO_CHAR(order.created_at, 'YYYY-MM-DD')")
      .orderBy("TO_CHAR(order.created_at, 'YYYY-MM-DD')", "ASC")
      .getRawMany<{ date: string; orderCount: string; revenue: string; payout: string }>();

    return rows.map((r) => ({ date: r.date, orderCount: Number(r.orderCount), revenue: Number(r.revenue).toFixed(2), payout: Number(r.payout).toFixed(2) }));
  }

  async getRestaurantTopProducts(restaurantId: string, period?: string, limit = DEFAULT_TOP_LIMIT) {
    return this.topProducts(restaurantId, period, limit);
  }

  // --- Shared helpers -----------------------------------------------------

  private async topProducts(restaurantId: string | undefined, period: string | undefined, limit: number) {
    const { since } = resolvePeriod(period);
    const qb = this.orderItemsRepository
      .createQueryBuilder("item")
      .innerJoin("item.order", "order")
      .where("order.status != :cancelled", { cancelled: OrderStatus.CANCELLED });
    if (restaurantId) qb.andWhere("order.restaurant_id = :restaurantId", { restaurantId });
    if (since) qb.andWhere("order.created_at >= :since", { since });

    // Grouped by name (not product_id) — product_id is nullable (SET NULL if the product was later
    // deleted), but the snapshotted name is always present and stable, so it's the only grouping
    // key guaranteed not to silently merge "deleted product" rows into one NULL bucket.
    const rows = await qb
      .select("item.product_name", "productName")
      .addSelect("SUM(item.quantity)", "unitsSold")
      .addSelect("COALESCE(SUM(item.line_total), 0)", "revenue")
      .groupBy("item.product_name")
      .orderBy("SUM(item.quantity)", "DESC")
      .limit(limit)
      .getRawMany<{ productName: string; unitsSold: string; revenue: string }>();

    return rows.map((r) => ({ productName: r.productName, unitsSold: Number(r.unitsSold), revenue: Number(r.revenue).toFixed(2) }));
  }
}
