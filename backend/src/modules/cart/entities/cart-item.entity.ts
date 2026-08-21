import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { User } from "../../users/entities/user.entity";
import { Restaurant } from "../../restaurants/entities/restaurant.entity";
import { Product } from "../../products/entities/product.entity";
import { ProductVariant } from "../../products/entities/product-variant.entity";

/**
 * One line in a customer's in-progress cart. Deliberately stores NO price —
 * a cart is pre-commitment, so unit/line prices are always computed live
 * from the current catalog on read. Price snapshotting happens at Order
 * creation (a later module), not here.
 */
@Entity({ name: "cart_items" })
export class CartItem extends BaseEntity {
  @Column({ name: "user_id", type: "uuid" })
  @Index()
  userId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  /** Denormalized from the product at add-time — never trusted from request input, and what enforces "one restaurant per cart". */
  @Column({ name: "restaurant_id", type: "uuid" })
  @Index()
  restaurantId!: string;

  @ManyToOne(() => Restaurant, { onDelete: "CASCADE" })
  @JoinColumn({ name: "restaurant_id" })
  restaurant!: Restaurant;

  @Column({ name: "product_id", type: "uuid" })
  productId!: string;

  @ManyToOne(() => Product, { onDelete: "CASCADE" })
  @JoinColumn({ name: "product_id" })
  product!: Product;

  @Column({ name: "variant_id", type: "uuid", nullable: true })
  variantId!: string | null;

  @ManyToOne(() => ProductVariant, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "variant_id" })
  variant!: ProductVariant | null;

  /** Selected add-on ids — a small unordered set, not worth a join table. */
  @Column({ name: "addon_ids", type: "jsonb", default: () => "'[]'" })
  addonIds!: string[];

  @Column({ type: "integer", default: 1 })
  quantity!: number;
}
