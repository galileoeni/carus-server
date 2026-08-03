import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { User } from './user'

export enum ComplaintStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in-progress',
  RESOLVED = 'resolved',
}

@Entity()
export class Contact extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id?: string

  @Column()
  message?: string

  @Column({
    type: 'enum',
    enum: ComplaintStatus,
    default: ComplaintStatus.OPEN,
  })
  status?: ComplaintStatus

  @ManyToOne(() => User)
  user?: User

  @CreateDateColumn()
  createdAt?: Date

  @UpdateDateColumn()
  updatedAt?: Date
}
