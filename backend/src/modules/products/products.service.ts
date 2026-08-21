import { forwardRef, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { Product } from "./entities/product.entity";
import { ProductVariant } from "./entities/product-variant.entity";
import { ProductAddon } from "./entities/product-addon.entity";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { CreateVariantDto } from "./dto/create-variant.dto";
import { UpdateVariantDto } from "./dto/update-variant.dto";
import { CreateAddonDto } from "./dto/create-addon.dto";
import { UpdateAddonDto } from "./dto/update-addon.dto";
import { CategoriesService } from "../categories/categories.service";
import { ProductErrors } from "../../common/exceptions/business.exception";

const RELATIONS = { variants: true, addons: true } as const;

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private readonly productsRepository: Repository<Product>,
    @InjectRepository(ProductVariant) private readonly variantsRepository: Repository<ProductVariant>,
    @InjectRepository(ProductAddon) private readonly addonsRepository: Repository<ProductAddon>,
    // Genuine circular dependency: see CategoriesService's matching forwardRef on ProductsService.
    @Inject(forwardRef(() => CategoriesService)) private readonly categoriesService: CategoriesService,
    private readonly dataSource: DataSource,
  ) {}

  findAllForRestaurant(restaurantId: string): Promise<Product[]> {
    return this.productsRepository.find({ where: { restaurantId }, relations: RELATIONS, order: { sortOrder: "ASC" } });
  }

  /** Used by Module 6's category-delete guard — real query now that this table exists. */
  countInCategory(categoryId: string): Promise<number> {
    return this.productsRepository.count({ where: { categoryId } });
  }

  async findOneOrThrow(id: string, restaurantId?: string): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: restaurantId ? { id, restaurantId } : { id },
      relations: RELATIONS,
    });
    if (!product) {
      throw new NotFoundException("Product not found");
    }
    return product;
  }

  async create(restaurantId: string, dto: CreateProductDto): Promise<Product> {
    await this.categoriesService.findOneOrThrow(dto.categoryId, restaurantId); // tenant-checked, 404s otherwise

    const product = this.productsRepository.create({
      restaurantId,
      categoryId: dto.categoryId,
      name: dto.name,
      description: dto.description ?? null,
      basePrice: String(dto.basePrice),
      sortOrder: dto.sortOrder ?? (await this.productsRepository.count({ where: { restaurantId, categoryId: dto.categoryId } })),
    });
    return this.productsRepository.save(product);
  }

  async update(id: string, restaurantId: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOneOrThrow(id, restaurantId);
    if (dto.categoryId) {
      await this.categoriesService.findOneOrThrow(dto.categoryId, restaurantId);
    }
    Object.assign(product, {
      ...dto,
      basePrice: dto.basePrice !== undefined ? String(dto.basePrice) : product.basePrice,
    });
    return this.productsRepository.save(product);
  }

  async setAvailability(id: string, restaurantId: string, isAvailable: boolean): Promise<Product> {
    const product = await this.findOneOrThrow(id, restaurantId);
    product.isAvailable = isAvailable;
    return this.productsRepository.save(product);
  }

  async remove(id: string, restaurantId: string): Promise<void> {
    const product = await this.findOneOrThrow(id, restaurantId);
    await this.productsRepository.remove(product);
  }

  async reorder(restaurantId: string, categoryId: string, orderedIds: string[]): Promise<Product[]> {
    return this.dataSource.transaction(async (manager) => {
      const products = await manager.find(Product, { where: { restaurantId, categoryId } });
      const validIds = new Set(products.map((p) => p.id));
      const isExactMatch = orderedIds.length === validIds.size && orderedIds.every((id) => validIds.has(id));
      if (!isExactMatch) {
        throw ProductErrors.reorderInvalid();
      }

      await Promise.all(orderedIds.map((id, index) => manager.update(Product, { id, restaurantId }, { sortOrder: index })));

      return manager.find(Product, { where: { restaurantId, categoryId }, relations: RELATIONS, order: { sortOrder: "ASC" } });
    });
  }

  // --- Variants ------------------------------------------------------------

  async addVariant(productId: string, restaurantId: string, dto: CreateVariantDto): Promise<ProductVariant> {
    await this.findOneOrThrow(productId, restaurantId);
    const variant = this.variantsRepository.create({ productId, name: dto.name, price: String(dto.price) });
    return this.variantsRepository.save(variant);
  }

  async updateVariant(productId: string, variantId: string, restaurantId: string, dto: UpdateVariantDto): Promise<ProductVariant> {
    await this.findOneOrThrow(productId, restaurantId);
    const variant = await this.variantsRepository.findOne({ where: { id: variantId, productId } });
    if (!variant) throw new NotFoundException("Variant not found");
    Object.assign(variant, { ...dto, price: dto.price !== undefined ? String(dto.price) : variant.price });
    return this.variantsRepository.save(variant);
  }

  async removeVariant(productId: string, variantId: string, restaurantId: string): Promise<void> {
    await this.findOneOrThrow(productId, restaurantId);
    const variant = await this.variantsRepository.findOne({ where: { id: variantId, productId } });
    if (!variant) throw new NotFoundException("Variant not found");
    await this.variantsRepository.remove(variant);
  }

  // --- Add-ons ---------------------------------------------------------------

  async addAddon(productId: string, restaurantId: string, dto: CreateAddonDto): Promise<ProductAddon> {
    await this.findOneOrThrow(productId, restaurantId);
    const addon = this.addonsRepository.create({ productId, name: dto.name, price: String(dto.price) });
    return this.addonsRepository.save(addon);
  }

  async updateAddon(productId: string, addonId: string, restaurantId: string, dto: UpdateAddonDto): Promise<ProductAddon> {
    await this.findOneOrThrow(productId, restaurantId);
    const addon = await this.addonsRepository.findOne({ where: { id: addonId, productId } });
    if (!addon) throw new NotFoundException("Add-on not found");
    Object.assign(addon, { ...dto, price: dto.price !== undefined ? String(dto.price) : addon.price });
    return this.addonsRepository.save(addon);
  }

  async removeAddon(productId: string, addonId: string, restaurantId: string): Promise<void> {
    await this.findOneOrThrow(productId, restaurantId);
    const addon = await this.addonsRepository.findOne({ where: { id: addonId, productId } });
    if (!addon) throw new NotFoundException("Add-on not found");
    await this.addonsRepository.remove(addon);
  }
}
