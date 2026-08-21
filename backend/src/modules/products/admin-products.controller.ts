import { Controller, Get, Param, ParseUUIDPipe } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { ProductsService } from "./products.service";

@ApiTags("Admin - Products")
@Controller("admin/restaurants/:restaurantId/products")
export class AdminProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @RequirePermissions("products:read")
  async list(@Param("restaurantId", ParseUUIDPipe) restaurantId: string) {
    return { message: "Products fetched", data: await this.productsService.findAllForRestaurant(restaurantId) };
  }
}
