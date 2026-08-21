import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Product } from "./product.entity";

/** A mutually-exclusive choice (e.g. Small/Medium/Large) — the customer picks exactly one, if any exist. */
@Entity({ name: "product_variants" })
export class ProductVariant extends BaseEntity {
  @Column({ name: "product_id", type: "uuid" })
  @Index()
  productId!: string;

  @ManyToOne(() => Product, (product) => product.variants, { onDelete: "CASCADE" })
  @JoinColumn({ name: "product_id" })
  product!: Product;

  @Column({ type: "varchar", length: 100 })
  name!: string;

  /** Absolute price for this variant, not a delta off the product's base_price. */
  @Column({ type: "decimal", precision: 10, scale: 2 })
  price!: string;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive!: boolean;
}
