import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Restaurant } from "../../restaurants/entities/restaurant.entity";
import { Category } from "../../categories/entities/category.entity";
import { ProductImage } from "./product-image.type";
import { ProductVariant } from "./product-variant.entity";
import { ProductAddon } from "./product-addon.entity";

@Entity({ name: "products" })
export class Product extends BaseEntity {
  @Column({ name: "restaurant_id", type: "uuid" })
  @Index()
  restaurantId!: string;

  @ManyToOne(() => Restaurant, { onDelete: "CASCADE" })
  @JoinColumn({ name: "restaurant_id" })
  restaurant!: Restaurant;

  @Column({ name: "category_id", type: "uuid" })
  @Index()
  categoryId!: string;

  @ManyToOne(() => Category, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "category_id" })
  category!: Category;

  @Column({ type: "varchar", length: 150 })
  name!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ name: "base_price", type: "decimal", precision: 10, scale: 2 })
  basePrice!: string;

  @Column({ type: "jsonb", default: () => "'[]'" })
  images!: ProductImage[];

  @Column({ name: "sort_order", type: "integer", default: 0 })
  sortOrder!: number;

  /** Permanent menu visibility — distinct from isAvailable, which is a day-to-day stock toggle. */
  @Column({ name: "is_active", type: "boolean", default: true })
  isActive!: boolean;

  @Column({ name: "is_available", type: "boolean", default: true })
  isAvailable!: boolean;

  @OneToMany(() => ProductVariant, (variant) => variant.product)
  variants!: ProductVariant[];

  @OneToMany(() => ProductAddon, (addon) => addon.product)
  addons!: ProductAddon[];
}
