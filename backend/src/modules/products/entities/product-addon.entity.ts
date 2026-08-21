import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Product } from "./product.entity";

/** An independent, multi-select extra (e.g. Extra Cheese) — customer can pick any number of these. */
@Entity({ name: "product_addons" })
export class ProductAddon extends BaseEntity {
  @Column({ name: "product_id", type: "uuid" })
  @Index()
  productId!: string;

  @ManyToOne(() => Product, (product) => product.addons, { onDelete: "CASCADE" })
  @JoinColumn({ name: "product_id" })
  product!: Product;

  @Column({ type: "varchar", length: 100 })
  name!: string;

  /** Additive extra cost — added to whatever the base/variant price already is. */
  @Column({ type: "decimal", precision: 10, scale: 2 })
  price!: string;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive!: boolean;
}
