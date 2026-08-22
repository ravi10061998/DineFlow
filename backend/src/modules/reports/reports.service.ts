import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Order, OrderStatus } from "../orders/entities/order.entity";
import { AnalyticsService } from "../analytics/analytics.service";
import { resolvePeriod } from "../../common/utils/period.util";

const ORDER_CSV_COLUMNS = ["Customer Name", "Customer Email", "Subtotal", "Delivery Fee", "Discount", "Commission", "Restaurant Payout", "Total", "Status", "Payment Status"];

const REVENUE_CSV_HEADERS = ["Date", "Order Count", "GMV/Revenue", "Commission/Payout"];

/**
 * CSV export is a presentation format on top of already-computed data, not a
 * new data layer — order rows are read directly (same "inject the repo
 * rather than grow another module's service" pattern used throughout this
 * app), and the revenue export reuses `AnalyticsService`'s exact time-series
 * query so a download can never drift from what its on-screen chart showed.
 */
@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Order) private readonly ordersRepository: Repository<Order>,
    private readonly analyticsService: AnalyticsService,
  ) {}

  async generateOrdersCsv(options: { restaurantId?: string; period?: string; status?: OrderStatus }): Promise<string> {
    const { since } = resolvePeriod(options.period);
    const qb = this.ordersRepository.createQueryBuilder("order").leftJoinAndSelect("order.customer", "customer");
    if (options.restaurantId) {
      qb.andWhere("order.restaurant_id = :restaurantId", { restaurantId: options.restaurantId });
    } else {
      qb.leftJoinAndSelect("order.restaurant", "restaurant");
    }
    if (since) qb.andWhere("order.created_at >= :since", { since });
    if (options.status) qb.andWhere("order.status = :status", { status: options.status });
    qb.orderBy("order.created_at", "DESC");

    const orders = await qb.getMany();
    const headers = ["Order Number", "Placed At", ...(options.restaurantId ? [] : ["Restaurant"]), ...ORDER_CSV_COLUMNS];
    const rows = orders.map((o) => [
      o.orderNumber,
      o.createdAt.toISOString(),
      ...(options.restaurantId ? [] : [o.restaurant?.name ?? ""]),
      o.customer?.fullName ?? "",
      o.customer?.email ?? "",
      o.subtotal,
      o.deliveryFee,
      o.discountAmount,
      o.commissionAmount,
      o.restaurantPayoutAmount,
      o.totalAmount,
      o.status,
      o.paymentStatus,
    ]);
    return this.toCsv(headers, rows);
  }

  async generateAdminRevenueCsv(period?: string): Promise<string> {
    const series = await this.analyticsService.getAdminRevenueTimeSeries(period);
    return this.toCsv(
      REVENUE_CSV_HEADERS,
      series.map((p) => [p.date, p.orderCount, p.gmv ?? "", p.commissionEarned ?? ""]),
    );
  }

  async generateRestaurantRevenueCsv(restaurantId: string, period?: string): Promise<string> {
    const series = await this.analyticsService.getRestaurantRevenueTimeSeries(restaurantId, period);
    return this.toCsv(
      REVENUE_CSV_HEADERS,
      series.map((p) => [p.date, p.orderCount, p.revenue ?? "", p.payout ?? ""]),
    );
  }

  /** RFC 4180-minimal: quote any field containing a comma, quote, or newline, doubling embedded quotes. */
  private toCsv(headers: string[], rows: (string | number)[][]): string {
    const escape = (value: string | number): string => {
      const str = String(value);
      if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    const lines = [headers.map(escape).join(","), ...rows.map((row) => row.map(escape).join(","))];
    return lines.join("\r\n");
  }
}
