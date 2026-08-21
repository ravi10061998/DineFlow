import { Column, Entity } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

@Entity({ name: "blog_categories" })
export class BlogCategory extends BaseEntity {
  @Column({ type: "varchar", length: 100 })
  name!: string;

  @Column({ type: "varchar", length: 120, unique: true })
  slug!: string;
}
