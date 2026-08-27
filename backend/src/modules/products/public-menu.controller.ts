import { Controller, Get, Param, ParseUUIDPipe, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { Public } from "../../common/decorators/public.decorator";
import { CategoriesService } from "../categories/categories.service";
import { ProductsService } from "./products.service";
import { ProductImagesService } from "./product-images.service";

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
    private readonly imagesService: ProductImagesService,
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

  /**
   * Product photos need to render on the customer-facing homepage/menu, but
   * the only existing image route (`restaurant/me/products/...`) is
   * identity-scoped to the owning restaurant's own staff — a customer or an
   * anonymous browser can't use it. This is the public read-only equivalent,
   * serving the same files by product id alone (no restaurant scoping
   * needed for a public menu photo).
   */
  @Get("products/:productId/images/:imageId/file")
  async downloadProductImage(
    @Param("productId", ParseUUIDPipe) productId: string,
    @Param("imageId") imageId: string,
    @Res() res: Response,
  ) {
    const product = await this.productsService.findOneOrThrow(productId);
    const image = this.imagesService.findImageOrThrow(product, imageId);
    const { stream, sizeBytes } = await this.imagesService.read(image);
    res.setHeader("Content-Type", image.mimeType);
    if (sizeBytes !== undefined) res.setHeader("Content-Length", String(sizeBytes));
    stream.pipe(res);
  }
}
