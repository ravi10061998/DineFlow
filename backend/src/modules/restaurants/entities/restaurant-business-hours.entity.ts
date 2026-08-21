import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Restaurant } from "./restaurant.entity";

@Entity({ name: "restaurant_business_hours" })
export class RestaurantBusinessHours extends BaseEntity {
  @Column({ name: "restaurant_id", type: "uuid" })
  @Index()
  restaurantId!: string;

  @ManyToOne(() => Restaurant, { onDelete: "CASCADE" })
  @JoinColumn({ name: "restaurant_id" })
  restaurant!: Restaurant;

  /** 0 = Sunday .. 6 = Saturday. Multiple rows per day are allowed (e.g. lunch + dinner splits). */
  @Column({ name: "day_of_week", type: "smallint" })
  dayOfWeek!: number;

  @Column({ name: "open_time", type: "time" })
  openTime!: string;

  @Column({ name: "close_time", type: "time" })
  closeTime!: string;

  @Column({ name: "is_closed", type: "boolean", default: false })
  isClosed!: boolean;
}
