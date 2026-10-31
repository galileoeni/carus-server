import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { User } from './user'

export enum BusinessIndustryEnum {
  HOSPITALITY = 'hospitality', // hotels, restaurants, bars
  RETAIL = 'retail', // supermarkets, shops
  MANUFACTURING = 'manufacturing',
  OFFICE = 'office',
  ESTATE = 'estate', // estates, residential managers
  EDUCATION = 'education',
  HEALTHCARE = 'healthcare',
  EVENTS = 'events',
  OTHER = 'other',
}

// Company details for a user with role 'business'. The user row holds the
// login (email, phone, password) and the contact person's name.
@Entity({ name: 'business_profiles' })
export class BusinessProfile {
  @PrimaryGeneratedColumn('uuid')
  id?: string

  @OneToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn()
  user?: User

  @Column()
  companyName?: string

  @Column({ type: 'enum', enum: BusinessIndustryEnum })
  industry?: BusinessIndustryEnum

  // CAC registration number (RC/BN), optional at sign-up
  @Column({ type: 'varchar', nullable: true })
  cacNumber?: string | null

  @Column()
  address?: string

  @Column()
  city?: string

  @Column({ type: 'varchar', nullable: true })
  contactRole?: string | null

  // Materials the business expects to hand over (MaterialEnum values)
  @Column({ type: 'simple-array' })
  wasteTypes?: string[]

  @Column({ type: 'int', nullable: true })
  estimatedMonthlyKg?: number | null

  @CreateDateColumn()
  createdAt?: Date

  @UpdateDateColumn()
  updatedAt?: Date
}
