import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Restaurant } from "./restaurant.entity";

@Entity({ name: "restaurant_holidays" })
export class RestaurantHoliday extends BaseEntity {
  @Column({ name: "restaurant_id", type: "uuid" })
  @Index()
  restaurantId!: string;

  @ManyToOne(() => Restaurant, { onDelete: "CASCADE" })
  @JoinColumn({ name: "restaurant_id" })
  restaurant!: Restaurant;

  @Column({ type: "date" })
  date!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  reason!: string | null;
}
