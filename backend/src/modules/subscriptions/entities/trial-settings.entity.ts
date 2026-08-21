import { Column, Entity } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { CommissionType } from "../../../common/enums/commission-type.enum";

/**
 * Single-row platform-wide config. There is always exactly one row —
 * enforced by the service always reading/updating the first (and only) row,
 * seeded by the migration, never by letting callers create new ones.
 */
@Entity({ name: "trial_settings" })
export class TrialSettings extends BaseEntity {
  @Column({ name: "is_enabled", type: "boolean", default: true })
  isEnabled!: boolean;

  @Column({ name: "trial_duration_days", type: "integer", default: 60 })
  trialDurationDays!: number;

  /** Days-remaining thresholds at which a reminder event fires, e.g. [30, 15, 7, 3, 1]. */
  @Column({ name: "reminder_schedule_days", type: "jsonb", default: () => "'[30, 15, 7, 3, 1]'" })
  reminderScheduleDays!: number[];

  /** Commission applied to orders while a restaurant is on TRIAL — defaults to 0% (commission-free trial). */
  @Column({ name: "trial_commission_type", type: "enum", enum: CommissionType, default: CommissionType.PERCENTAGE })
  trialCommissionType!: CommissionType;

  @Column({ name: "trial_commission_value", type: "decimal", precision: 10, scale: 2, default: 0 })
  trialCommissionValue!: string;
}
