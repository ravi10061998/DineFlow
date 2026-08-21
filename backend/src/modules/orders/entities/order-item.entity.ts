import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Order } from "./order.entity";
import { Product } from "../../products/entities/product.entity";
import { ProductVariant } from "../../products/entities/product-variant.entity";

export interface OrderItemAddonSnapshot {
  id: string;
  name: string;
  price: string;
}

/**
 * One line in a placed order. Fully snapshotted — product/variant/add-on
 * names and prices are copied at checkout time, not looked up live, so a
 * later menu edit (or even the product being deleted) never changes a past
 * order's numbers. productId/variantId are kept as nullable FKs purely for
 * traceability — Products supports hard delete, so these must never block it.
 */
@Entity({ name: "order_items" })
export class OrderItem extends BaseEntity {
  @Column({ name: "order_id", type: "uuid" })
  orderId!: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: "CASCADE" })
  @JoinColumn({ name: "order_id" })
  order!: Order;

  @Column({ name: "product_id", type: "uuid", nullable: true })
  productId!: string | null;

  @ManyToOne(() => Product, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "product_id" })
  product!: Product | null;

  @Column({ name: "product_name", type: "varchar", length: 150 })
  productName!: string;

  @Column({ name: "variant_id", type: "uuid", nullable: true })
  variantId!: string | null;

  @ManyToOne(() => ProductVariant, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "variant_id" })
  variant!: ProductVariant | null;

  @Column({ name: "variant_name", type: "varchar", length: 100, nullable: true })
  variantName!: string | null;

  @Column({ type: "jsonb", default: () => "'[]'" })
  addons!: OrderItemAddonSnapshot[];

  @Column({ name: "unit_price", type: "decimal", precision: 10, scale: 2 })
  unitPrice!: string;

  @Column({ type: "integer" })
  quantity!: number;

  @Column({ name: "line_total", type: "decimal", precision: 10, scale: 2 })
  lineTotal!: string;
}
