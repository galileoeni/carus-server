import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { Contribution } from './contribution'
import { Transaction } from './transactions'
import { User } from './user'

@Entity({ name: 'wallet' })
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id?: string

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  points?: number

  @CreateDateColumn()
  createdAt?: Date

  @UpdateDateColumn()
  updatedAt?: Date

  @OneToOne(() => User, (user) => user.wallet, { onDelete: 'CASCADE' })
  @JoinColumn()
  user?: User

  @OneToMany(() => Transaction, (transaction) => transaction.wallet)
  @JoinColumn()
  transactions?: Transaction[]

  @OneToMany(() => Contribution, (contribution) => contribution.wallet)
  @JoinColumn()
  contributions?: Contribution[]
}
