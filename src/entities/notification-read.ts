import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'

import { Notification } from './notification'
import { User } from './user'

@Entity({ name: 'notification_reads' })
export class NotificationRead {
  @PrimaryGeneratedColumn('uuid')
  id?: string

  @Column({ nullable: true })
  userId?: string

  @Column({ nullable: true })
  userEmail?: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'userId', referencedColumnName: 'id' },
    { name: 'userEmail', referencedColumnName: 'email' },
  ])
  user?: User

  @Column({ nullable: true })
  notificationId?: string

  @ManyToOne(() => Notification, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'notificationId' })
  notification?: Notification

  @CreateDateColumn()
  createdAt?: Date
}
