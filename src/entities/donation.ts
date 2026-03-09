import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { Contribution } from './contribution'

@Entity({ name: 'donations' })
export class Donation {
  @PrimaryGeneratedColumn('uuid')
  id?: string

  @Column({ nullable: false })
  title?: string

  @Column({ nullable: false, type: 'text' })
  description?: string

  @Column({
    nullable: false,
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  target?: number

  @Column({ nullable: false })
  duration?: Date

  @Column({ nullable: true, type: "varchar" })
  image?: string | null

  @Column({
    type: "enum",
    enum: ["pending", "active", "completed"],
    default: "active",
  })
  status?: string

  @CreateDateColumn()
  createdAt?: Date

  @UpdateDateColumn()
  updatedAt?: Date

  @OneToMany(() => Contribution, (contribution) => contribution.donation)
  contributions?: Contribution[]
}
