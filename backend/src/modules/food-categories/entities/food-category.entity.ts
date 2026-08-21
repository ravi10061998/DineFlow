import { Column, Entity } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

/**
 * A platform-wide browsing taxonomy (Pizza, Burger, Biryani, ...) — distinct
 * from Module 6's `categories`, which are each restaurant's own private menu
 * sections. This is exactly the "cuisine taxonomy for customer browsing"
 * Module 6's own notes deferred. Deliberately a lightweight navigation/filter
 * concept for now (browsing links to a text-matched restaurant search), not
 * a per-product tagging system — that's a reasonable future enhancement.
 */
@Entity({ name: "food_categories" })
export class FoodCategory extends BaseEntity {
  @Column({ type: "varchar", length: 100 })
  name!: string;

  @Column({ type: "varchar", length: 120, unique: true })
  slug!: string;

  @Column({ name: "image_url", type: "varchar", length: 500, nullable: true })
  imageUrl!: string | null;

  @Column({ name: "sort_order", type: "integer", default: 0 })
  sortOrder!: number;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive!: boolean;
}
