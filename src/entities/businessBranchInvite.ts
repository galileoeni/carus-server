import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'

import { BusinessProfile } from './businessProfile'

// A private sign-up link an HQ shares with one of its locations. Whoever
// signs up through it joins as a branch of that HQ, no approval needed.
// Each link works once.
@Entity({ name: 'business_branch_invites' })
export class BusinessBranchInvite {
  @PrimaryGeneratedColumn('uuid')
  id?: string

  @Index({ unique: true })
  @Column()
  token?: string

  @ManyToOne(() => BusinessProfile, { nullable: false, onDelete: 'CASCADE' })
  parent?: BusinessProfile

  // Optional name HQ gives the location; the branch can change it at sign-up
  @Column({ type: 'varchar', nullable: true })
  branchName?: string | null

  @Column({ type: 'timestamp' })
  expiresAt?: Date

  @Column({ type: 'timestamp', nullable: true })
  usedAt?: Date | null

  // The branch that signed up with this link
  @ManyToOne(() => BusinessProfile, { nullable: true, onDelete: 'SET NULL' })
  branch?: BusinessProfile | null

  @CreateDateColumn()
  createdAt?: Date
}
