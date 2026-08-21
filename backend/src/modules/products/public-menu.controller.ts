import { Controller, Get, Param, ParseUUIDPipe } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../../common/decorators/public.decorator";
import { CategoriesService } from "../categories/categories.service";
import { ProductsService } from "./products.service";

/**
 * The minimal public "browse a restaurant's menu" slice needed to make
 * Cart/Orders reachable from a real UI — not the full storefront (search,
 * ratings, delivery-radius filtering), which is a later module's scope.
 * Only active categories and active products are shown; unavailable
 * (out-of-stock) products still appear, since browsing shows the menu, not
 * just what's orderable right now — the customer decides at add-to-cart time.
 */
@ApiTags("Public - Storefront")
@Public()
@Controller("restaurants/:restaurantId/menu")
export class PublicMenuController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly productsService: ProductsService,
  ) {}

  @Get()
  async getMenu(@Param("restaurantId", ParseUUIDPipe) restaurantId: string) {
    const [categories, products] = await Promise.all([
      this.categoriesService.findAllForRestaurant(restaurantId),
      this.productsService.findAllForRestaurant(restaurantId),
    ]);

    const visibleProducts = products.filter((p) => p.isActive);
    const menu = categories
      .filter((c) => c.isActive)
      .map((category) => ({
        id: category.id,
        name: category.name,
        description: category.description,
        products: visibleProducts
          .filter((p) => p.categoryId === category.id)
          .map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            basePrice: p.basePrice,
            images: p.images,
            isAvailable: p.isAvailable,
            variants: p.variants.filter((v) => v.isActive),
            addons: p.addons.filter((a) => a.isActive),
          })),
      }));

    return { message: "Menu fetched", data: menu };
  }
}
