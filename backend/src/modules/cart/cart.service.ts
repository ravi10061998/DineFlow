import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { CartItem } from "./entities/cart-item.entity";
import { AddCartItemDto } from "./dto/add-cart-item.dto";
import { ProductsService } from "../products/products.service";
import { RestaurantsService } from "../restaurants/restaurants.service";
import { Product } from "../products/entities/product.entity";
import { CartErrors } from "../../common/exceptions/business.exception";

export interface CartLineAddon {
  id: string;
  name: string;
  price: string;
}

export interface CartLineView {
  id: string;
  productId: string;
  productName: string;
  variantId: string | null;
  variantName: string | null;
  variantPrice: string | null;
  addons: CartLineAddon[];
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  /** False if the product/variant/add-on it references has since gone inactive or unavailable — kept, not silently dropped. */
  isAvailable: boolean;
}

export interface CartView {
  restaurantId: string | null;
  restaurantName: string | null;
  items: CartLineView[];
  subtotal: string;
}

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartItem) private readonly cartRepository: Repository<CartItem>,
    private readonly productsService: ProductsService,
    private readonly restaurantsService: RestaurantsService,
    private readonly dataSource: DataSource,
  ) {}

  async getCart(userId: string): Promise<CartView> {
    const items = await this.cartRepository.find({ where: { userId }, order: { createdAt: "ASC" } });
    if (items.length === 0) {
      return { restaurantId: null, restaurantName: null, items: [], subtotal: "0.00" };
    }

    const lines: CartLineView[] = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await this.productsService.findOneOrThrow(item.productId).catch(() => null);
      const line = this.toLineView(item, product);
      lines.push(line);
      subtotal += Number(line.lineTotal);
    }

    const restaurant = await this.restaurantsService.findByIdOrThrow(items[0].restaurantId).catch(() => null);

    return {
      restaurantId: items[0].restaurantId,
      restaurantName: restaurant?.name ?? null,
      items: lines,
      subtotal: subtotal.toFixed(2),
    };
  }

  async addItem(userId: string, dto: AddCartItemDto): Promise<CartView> {
    const product = await this.productsService.findOneOrThrow(dto.productId);
    if (!product.isActive || !product.isAvailable) {
      throw CartErrors.productUnavailable();
    }

    let variant = null;
    if (dto.variantId) {
      variant = product.variants.find((v) => v.id === dto.variantId) ?? null;
      if (!variant) throw CartErrors.invalidVariant();
      if (!variant.isActive) throw CartErrors.productUnavailable();
    }

    const addonIds = [...new Set(dto.addonIds ?? [])].sort();
    for (const addonId of addonIds) {
      const addon = product.addons.find((a) => a.id === addonId);
      if (!addon) throw CartErrors.invalidAddon();
      if (!addon.isActive) throw CartErrors.productUnavailable();
    }

    const quantity = dto.quantity ?? 1;
    const existingItems = await this.cartRepository.find({ where: { userId } });

    const hasDifferentRestaurant = existingItems.length > 0 && existingItems[0].restaurantId !== product.restaurantId;
    if (hasDifferentRestaurant && !dto.replaceCart) {
      const existingRestaurant = await this.restaurantsService.findByIdOrThrow(existingItems[0].restaurantId);
      throw CartErrors.differentRestaurant(existingRestaurant.name);
    }

    if (hasDifferentRestaurant && dto.replaceCart) {
      await this.dataSource.transaction(async (manager) => {
        await manager.delete(CartItem, { userId });
        const created = manager.create(CartItem, {
          userId,
          restaurantId: product.restaurantId,
          productId: product.id,
          variantId: variant?.id ?? null,
          addonIds,
          quantity,
        });
        await manager.save(created);
      });
      return this.getCart(userId);
    }

    // Same restaurant (or an empty cart) — merge into a matching line instead of duplicating it.
    const matching = existingItems.find(
      (item) =>
        item.productId === product.id &&
        item.variantId === (variant?.id ?? null) &&
        this.sameAddonSet(item.addonIds, addonIds),
    );

    if (matching) {
      matching.quantity = Math.min(50, matching.quantity + quantity);
      await this.cartRepository.save(matching);
    } else {
      const created = this.cartRepository.create({
        userId,
        restaurantId: product.restaurantId,
        productId: product.id,
        variantId: variant?.id ?? null,
        addonIds,
        quantity,
      });
      await this.cartRepository.save(created);
    }

    return this.getCart(userId);
  }

  async updateQuantity(id: string, userId: string, quantity: number): Promise<CartView> {
    const item = await this.cartRepository.findOne({ where: { id, userId } });
    if (!item) {
      throw new NotFoundException("Cart item not found");
    }
    item.quantity = quantity;
    await this.cartRepository.save(item);
    return this.getCart(userId);
  }

  async removeItem(id: string, userId: string): Promise<CartView> {
    const item = await this.cartRepository.findOne({ where: { id, userId } });
    if (!item) {
      throw new NotFoundException("Cart item not found");
    }
    await this.cartRepository.remove(item);
    return this.getCart(userId);
  }

  async clearCart(userId: string): Promise<void> {
    await this.cartRepository.delete({ userId });
  }

  private sameAddonSet(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    return sortedA.every((id, i) => id === b[i]);
  }

  private toLineView(item: CartItem, product: Product | null): CartLineView {
    if (!product) {
      return {
        id: item.id,
        productId: item.productId,
        productName: "Item no longer available",
        variantId: item.variantId,
        variantName: null,
        variantPrice: null,
        addons: [],
        quantity: item.quantity,
        unitPrice: "0.00",
        lineTotal: "0.00",
        isAvailable: false,
      };
    }

    const variant = item.variantId ? (product.variants.find((v) => v.id === item.variantId) ?? null) : null;
    const addons = item.addonIds.map((id) => product.addons.find((a) => a.id === id)).filter((a): a is NonNullable<typeof a> => !!a);

    const unitPrice = Number(variant ? variant.price : product.basePrice) + addons.reduce((sum, a) => sum + Number(a.price), 0);
    const lineTotal = unitPrice * item.quantity;

    const isAvailable =
      product.isActive &&
      product.isAvailable &&
      (variant ? variant.isActive : true) &&
      addons.length === item.addonIds.length &&
      addons.every((a) => a.isActive);

    return {
      id: item.id,
      productId: item.productId,
      productName: product.name,
      variantId: item.variantId,
      variantName: variant?.name ?? null,
      variantPrice: variant?.price ?? null,
      addons: addons.map((a) => ({ id: a.id, name: a.name, price: a.price })),
      quantity: item.quantity,
      unitPrice: unitPrice.toFixed(2),
      lineTotal: lineTotal.toFixed(2),
      isAvailable,
    };
  }
}
