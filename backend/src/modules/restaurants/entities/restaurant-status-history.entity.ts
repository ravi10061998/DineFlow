import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Restaurant, RestaurantStatus } from "./restaurant.entity";
import { User } from "../../users/entities/user.entity";

@Entity({ name: "restaurant_status_history" })
export class RestaurantStatusHistory extends BaseEntity {
  @Column({ name: "restaurant_id", type: "uuid" })
  @Index()
  restaurantId!: string;

  @ManyToOne(() => Restaurant, { onDelete: "CASCADE" })
  @JoinColumn({ name: "restaurant_id" })
  restaurant!: Restaurant;

  @Column({ name: "from_status", type: "enum", enum: RestaurantStatus })
  fromStatus!: RestaurantStatus;

  @Column({ name: "to_status", type: "enum", enum: RestaurantStatus })
  toStatus!: RestaurantStatus;

  @Column({ type: "varchar", length: 500, nullable: true })
  reason!: string | null;

  @Column({ name: "changed_by_user_id", type: "uuid" })
  changedByUserId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "changed_by_user_id" })
  changedByUser!: User;
}
