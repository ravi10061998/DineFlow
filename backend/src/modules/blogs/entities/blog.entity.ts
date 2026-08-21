import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { BlogCategory } from "./blog-category.entity";

@Entity({ name: "blogs" })
export class Blog extends BaseEntity {
  @Column({ type: "varchar", length: 200 })
  title!: string;

  @Column({ type: "varchar", length: 220, unique: true })
  slug!: string;

  @Column({ name: "cover_image_url", type: "varchar", length: 500, nullable: true })
  coverImageUrl!: string | null;

  @Column({ name: "category_id", type: "uuid", nullable: true })
  categoryId!: string | null;

  @ManyToOne(() => BlogCategory, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "category_id" })
  category!: BlogCategory | null;

  @Column({ name: "author_name", type: "varchar", length: 150 })
  authorName!: string;

  @Column({ type: "varchar", length: 500 })
  excerpt!: string;

  @Column({ type: "text" })
  content!: string;

  @Column({ name: "reading_time_minutes", type: "integer", default: 3 })
  readingTimeMinutes!: number;

  @Column({ name: "is_published", type: "boolean", default: false })
  isPublished!: boolean;

  @Column({ name: "published_at", type: "timestamptz", nullable: true })
  publishedAt!: Date | null;
}
