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

import { Contribution } from './contribution'
import { Donation } from './donation'
import { User } from './user'

export enum DonationPaymentStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
}

// A cash donation paid through Paystack. Once paid, it is also recorded as a
// Contribution (source 'cash') so campaign totals include it.
@Entity({ name: 'donation_payments' })
export class DonationPayment {
  @PrimaryGeneratedColumn('uuid')
  id?: string

  @Column({ unique: true })
  reference?: string

  // Naira
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount?: number

  @Column()
  donorName?: string

  @Column()
  donorEmail?: string

  @Column({
    type: 'enum',
    enum: DonationPaymentStatus,
    default: DonationPaymentStatus.PENDING,
  })
  status?: DonationPaymentStatus

  @Column({ type: 'varchar', nullable: true })
  channel?: string | null

  @Column({ type: 'timestamp', nullable: true })
  paidAt?: Date | null

  @ManyToOne(() => Donation, { nullable: false })
  donation?: Donation

  // Set when the donor was logged in
  @ManyToOne(() => User, { nullable: true })
  user?: User | null

  @OneToOne(() => Contribution, { nullable: true })
  @JoinColumn()
  contribution?: Contribution | null

  @CreateDateColumn()
  createdAt?: Date

  @UpdateDateColumn()
  updatedAt?: Date
}
