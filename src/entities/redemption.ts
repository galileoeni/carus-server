import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { User } from './user'

export enum RedemptionType {
  AIRTIME = 'airtime',
  CASH = 'cash',
}

export enum RedemptionStatus {
  PENDING = 'pending',
  FULFILLED = 'fulfilled',
  CANCELLED = 'cancelled',
  DECLINED = 'declined',
  APPROVED = 'approved',
  PAID = 'paid'
}

@Entity({ name: 'redemptions' })
export class Redemption {
  @PrimaryGeneratedColumn('uuid')
  id?: string

  @Column({
    type: 'enum',
    enum: RedemptionType,
  })
  type?: RedemptionType

  @Column({
    nullable: false,
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  points?: number

  @Column({ nullable: true })
  network?: string

  @Column({ nullable: true })
  phoneNumber?: string

  @Column({ nullable: true })
  accountNumber?: string

  @Column({ nullable: true })
  bankName?: string

  @Column({ nullable: true })
  accountName?: string

  @Column({
    type: 'enum',
    enum: RedemptionStatus,
    default: RedemptionStatus.PENDING,
  })
  status?: RedemptionStatus

  @Column({ nullable: true, type: 'text' })
  description?: string

  @CreateDateColumn()
  createdAt?: Date

  @UpdateDateColumn()
  updatedAt?: Date

  @ManyToOne(() => User, (user) => user.redemptions)
  user?: User
}
