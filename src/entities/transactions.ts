import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Schedule } from './schedule'
import { User } from './user'
import { Wallet } from './wallet'

export enum TransactionType {
  PICKUP = 'pickup',
  DROPOFF = 'dropoff',
  DONATION = 'donation',
  CASH = 'cash',
  AIRTIME = 'airtime',
  GIFTCARD = 'giftcard',
}

export enum TransactionDirection {
  CREDIT = 'credit',
  DEBIT = 'debit',
}

export enum TransactionStatus {
  PENDING = 'pending',
  FULFILLED = 'fulfilled',
  CANCELLED = 'cancelled',
  MISSED = 'missed',
  COMPLETED = 'completed',
}

@Entity({ name: 'transaction' })
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id?: string

  @Column({
    nullable: true,
    type: 'enum',
    enum: TransactionType,
  })
  type?: TransactionType

  @Column({
    nullable: false,
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  amount?: number

  @Column({
    nullable: true,
    type: 'enum',
    enum: TransactionDirection,
  })
  direction?: TransactionDirection

  @Column({
    nullable: false,
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  charges?: number

  @Column({ nullable: false })
  date?: Date

  @CreateDateColumn()
  createdAt?: Date

  @UpdateDateColumn()
  updatedAt?: Date

  @Column({
    nullable: false,
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status?: TransactionStatus

  @Column({ nullable: true, type: 'text' })
  description?: string

  @OneToOne(() => Schedule, (schedule) => schedule.transaction)
  schedule?: Schedule

  @ManyToOne(() => User, (user) => user.transactions, { onDelete: 'SET NULL' })
  @JoinColumn()
  user?: User

  @ManyToOne(() => Wallet, (wallet) => wallet.transactions)
  wallet?: Wallet
}
