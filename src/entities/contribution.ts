import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { Donation } from './donation'
import { User } from './user'
import { Wallet } from './wallet'

@Entity({ name: 'contributions' })
export class Contribution {
  @PrimaryGeneratedColumn('uuid')
  id?: string

  @Column({
    nullable: false,
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  amount?: number

  // 'points' = donated from wallet earnings, 'cash' = paid via Paystack
  @Column({ type: 'varchar', default: 'points' })
  source?: 'points' | 'cash'

  @CreateDateColumn()
  createdAt?: Date

  @UpdateDateColumn()
  updatedAt?: Date

  @ManyToOne(() => User, (user) => user.contributions)
  user?: User

  @ManyToOne(() => Wallet, (wallet) => wallet.contributions)
  wallet?: Wallet

  @ManyToOne(() => Donation, (donation) => donation.contributions)
  donation?: Donation
}
