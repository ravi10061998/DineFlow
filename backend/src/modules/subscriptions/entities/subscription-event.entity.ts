import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Restaurant } from "../../restaurants/entities/restaurant.entity";
import { RestaurantSubscription } from "./restaurant-subscription.entity";

export enum SubscriptionEventType {
  TRIAL_STARTED = "TRIAL_STARTED",
  TRIAL_REMINDER_SENT = "TRIAL_REMINDER_SENT",
  TRIAL_EXPIRED = "TRIAL_EXPIRED",
  SUBSCRIBED = "SUBSCRIBED",
  PLAN_CHANGED = "PLAN_CHANGED",
  CANCELLED = "CANCELLED",
  EXPIRED = "EXPIRED",
}

@Entity({ name: "subscription_events" })
export class SubscriptionEvent extends BaseEntity {
  @Column({ name: "restaurant_id", type: "uuid" })
  @Index()
  restaurantId!: string;

  @ManyToOne(() => Restaurant, { onDelete: "CASCADE" })
  @JoinColumn({ name: "restaurant_id" })
  restaurant!: Restaurant;

  @Column({ name: "subscription_id", type: "uuid" })
  @Index()
  subscriptionId!: string;

  @ManyToOne(() => RestaurantSubscription, { onDelete: "CASCADE" })
  @JoinColumn({ name: "subscription_id" })
  subscription!: RestaurantSubscription;

  @Column({ type: "enum", enum: SubscriptionEventType })
  type!: SubscriptionEventType;

  @Column({ type: "jsonb", nullable: true })
  metadata!: Record<string, unknown> | null;
}
