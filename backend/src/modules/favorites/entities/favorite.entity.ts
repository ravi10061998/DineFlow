import { Column, Entity, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

export enum FavoriteTargetType {
  RESTAURANT = "RESTAURANT",
  PRODUCT = "PRODUCT",
}

/**
 * A customer's saved restaurant or product. `targetId` isn't a real FK on
 * purpose — it points at whichever table `targetType` names, and TypeORM
 * has no clean way to express a polymorphic FK; the target's existence is
 * validated in the service layer at add-time instead.
 */
@Entity({ name: "favorites" })
@Index(["userId", "targetType", "targetId"], { unique: true })
export class Favorite extends BaseEntity {
  @Column({ name: "user_id", type: "uuid" })
  @Index()
  userId!: string;

  @Column({ name: "target_type", type: "enum", enum: FavoriteTargetType })
  targetType!: FavoriteTargetType;

  @Column({ name: "target_id", type: "uuid" })
  targetId!: string;
}
