import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../../common/decorators/public.decorator";
import { StoreService } from "./store.service";

@ApiTags("Public - Storefront")
@Public()
@Controller("store")
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Get("home")
  async home() {
    return { message: "Home feed fetched", data: await this.storeService.getHome() };
  }

  @Get("search")
  async search(@Query("q") q?: string) {
    if (!q || q.trim().length === 0) {
      return { message: "Search results fetched", data: { restaurants: [], products: [], categories: [] } };
    }
    return { message: "Search results fetched", data: await this.storeService.search(q.trim()) };
  }

  @Get("restaurants/featured")
  async featured() {
    return { message: "Featured restaurants fetched", data: await this.storeService.getFeaturedRestaurants() };
  }

  @Get("restaurants/popular")
  async popular() {
    return { message: "Popular restaurants fetched", data: await this.storeService.getPopularRestaurants() };
  }

  @Get("restaurants/nearby")
  async nearby(@Query("lat") lat?: string, @Query("lng") lng?: string) {
    if (!lat || !lng) {
      throw new BadRequestException("lat and lng query parameters are required");
    }
    return { message: "Nearby restaurants fetched", data: await this.storeService.getNearbyRestaurants(Number(lat), Number(lng)) };
  }

  @Get("products/popular")
  async popularProducts() {
    return { message: "Popular products fetched", data: await this.storeService.getPopularProducts() };
  }

  @Get("products/trending")
  async trendingProducts() {
    return { message: "Trending products fetched", data: await this.storeService.getTrendingProducts() };
  }
}
