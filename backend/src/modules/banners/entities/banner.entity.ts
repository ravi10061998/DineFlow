import { Column, Entity } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

/**
 * A homepage promotional banner. `startDate`/`endDate` are both optional —
 * a banner with neither is always eligible while `isActive`; either bound
 * lets admin schedule a run without a code deploy.
 */
@Entity({ name: "banners" })
export class Banner extends BaseEntity {
  @Column({ type: "varchar", length: 200 })
  title!: string;

  @Column({ type: "varchar", length: 300, nullable: true })
  subtitle!: string | null;

  @Column({ name: "image_url", type: "varchar", length: 500 })
  imageUrl!: string;

  @Column({ name: "cta_label", type: "varchar", length: 50, nullable: true })
  ctaLabel!: string | null;

  /** A relative app path (e.g. "/restaurants/abc-123") or an external URL — the frontend decides how to navigate. */
  @Column({ name: "cta_url", type: "varchar", length: 500, nullable: true })
  ctaUrl!: string | null;

  @Column({ name: "start_date", type: "timestamptz", nullable: true })
  startDate!: Date | null;

  @Column({ name: "end_date", type: "timestamptz", nullable: true })
  endDate!: Date | null;

  @Column({ name: "sort_order", type: "integer", default: 0 })
  sortOrder!: number;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive!: boolean;
}
