import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { User } from './user'
import { MaterialEnum } from '../@types/schedule'

export interface PickupPhoto {
  url: string
  // Cloudinary public id, or a local file path in development
  key: string
}

export enum PlanFrequencyEnum {
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly', // every two weeks
  MONTHLY = 'monthly',
  FLEXIBLE = 'flexible', // no pattern; the Carus team adds dates one by one
}

export enum PickupWindowEnum {
  MORNING = 'morning', // 8am – 12pm
  AFTERNOON = 'afternoon', // 12pm – 4pm
}

export enum BusinessPickupKindEnum {
  SCHEDULED = 'scheduled', // from the plan or added by the Carus team
  QUICK = 'quick', // requested by the business, needs approval
}

export enum BusinessPickupStatusEnum {
  REQUESTED = 'requested', // quick pickup awaiting approval
  SCHEDULED = 'scheduled', // confirmed and on the calendar
  COMPLETED = 'completed',
  MISSED = 'missed',
  CANCELLED = 'cancelled',
  DECLINED = 'declined', // quick request turned down
}

// The regular collection agreed between a business and Carus. One per
// business; set by the Carus team in the admin dashboard.
@Entity({ name: 'business_schedule_plans' })
export class BusinessSchedulePlan {
  @PrimaryGeneratedColumn('uuid')
  id?: string

  @OneToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn()
  business?: User

  @Column({ type: 'enum', enum: PlanFrequencyEnum })
  frequency?: PlanFrequencyEnum

  // 1 = Monday ... 6 = Saturday (weekly and biweekly)
  @Column({ type: 'int', nullable: true })
  dayOfWeek?: number | null

  // 1–28 so it exists in every month (monthly)
  @Column({ type: 'int', nullable: true })
  dayOfMonth?: number | null

  @Column({
    type: 'enum',
    enum: PickupWindowEnum,
    default: PickupWindowEnum.MORNING,
  })
  window?: PickupWindowEnum

  // First collection on or after this date; also fixes which weeks a
  // biweekly plan falls on
  @Column({ type: 'date' })
  startDate?: string

  @Column({ type: 'text', nullable: true })
  notes?: string | null

  @CreateDateColumn()
  createdAt?: Date

  @UpdateDateColumn()
  updatedAt?: Date
}

// A single collection for a business
@Entity({ name: 'business_pickups' })
@Index(['business', 'date'])
// A plan produces at most one pickup per day, even if two syncs race
@Index('UQ_business_pickups_plan_date', ['business', 'date'], {
  unique: true,
  where: '"fromPlan" = true',
})
export class BusinessPickup {
  @PrimaryGeneratedColumn('uuid')
  id?: string

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  business?: User

  @Column({ type: 'date' })
  date?: string

  @Column({
    type: 'enum',
    enum: PickupWindowEnum,
    default: PickupWindowEnum.MORNING,
  })
  window?: PickupWindowEnum

  @Column({ type: 'enum', enum: BusinessPickupKindEnum })
  kind?: BusinessPickupKindEnum

  @Column({ type: 'enum', enum: BusinessPickupStatusEnum })
  status?: BusinessPickupStatusEnum

  // Generated from the plan (replaced if the plan changes)
  @Column({ default: false })
  fromPlan?: boolean

  // Written by the business when requesting a quick pickup
  @Column({ type: 'text', nullable: true })
  requestNote?: string | null

  // Shown to the business, e.g. why a request was declined
  @Column({ type: 'text', nullable: true })
  adminNote?: string | null

  /* Filled in by the Carus team when the pickup is collected */

  @Column({ type: 'timestamp', nullable: true })
  collectedAt?: Date | null

  // Sum of the items, kept for quick totals
  @Column({ type: 'decimal', precision: 10, scale: 1, nullable: true })
  totalWeightKg?: number | null

  // Up to 5 photos as evidence of the collection
  @Column({ type: 'jsonb', default: () => "'[]'" })
  photos?: PickupPhoto[]

  @OneToMany(() => BusinessPickupItem, (item) => item.pickup, {
    cascade: true,
  })
  items?: BusinessPickupItem[]

  @CreateDateColumn()
  createdAt?: Date

  @UpdateDateColumn()
  updatedAt?: Date
}

// Weight of one material collected in a pickup
@Entity({ name: 'business_pickup_items' })
export class BusinessPickupItem {
  @PrimaryGeneratedColumn('uuid')
  id?: string

  @ManyToOne(() => BusinessPickup, (pickup) => pickup.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  pickup?: BusinessPickup

  @Column({ type: 'enum', enum: MaterialEnum })
  material?: MaterialEnum

  @Column({ type: 'decimal', precision: 10, scale: 1 })
  weightKg?: number
}
