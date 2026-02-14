import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { NotificationRead } from './notification-read'
import { User } from './user'

export enum NotificationType {
  ANNOUNCEMENT = 'announcement',
  WELCOME = 'welcome',
  PASSWORD_CHANGE = 'password_change',
  PROFILE_UPDATE = 'profile_update',
  POINTS_EARNED = 'points_earned',
  TRANSACTION_SUCCESS = 'transaction_success',
  TRANSACTION_FAILED = 'transaction_failed',
  REMINDER = 'reminder',
  SECURITY_ALERT = 'security_alert',
}

@Entity({ name: 'notifications' })
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id?: string

  @Column({ type: 'varchar' })
  title?: string

  @Column({ type: 'text' })
  message?: string

  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.ANNOUNCEMENT,
  })
  type?: NotificationType

  @Column({ default: false })
  isRead?: boolean

  @Column({ nullable: true })
  userId?: string

  @Column({ nullable: true })
  userEmail?: string

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'userId', referencedColumnName: 'id' },
    { name: 'userEmail', referencedColumnName: 'email' },
  ])
  user?: User

  @OneToMany(() => NotificationRead, (read) => read.notification)
  reads?: NotificationRead[]

  @CreateDateColumn()
  createdAt?: Date

  @UpdateDateColumn()
  updatedAt?: Date
}
