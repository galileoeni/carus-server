import { Transform } from 'class-transformer'
import {
  IsBoolean,
  IsDefined,
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
  NotContains,
} from 'class-validator'
import { randomBytes } from 'crypto'
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { UserRoleEnum } from '../@types/user'
import { Contribution } from './contribution'
import { Redemption } from './redemption'
import { Schedule } from './schedule'
import { Transaction } from './transactions'
import { Wallet } from './wallet'

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id?: string

  @Column({ nullable: false })
  first_name?: string

  @Column({ nullable: false })
  last_name?: string

  @Column({ nullable: true, type: 'varchar' })
  address?: string | null

  @Column({ nullable: true, type: 'varchar' })
  region?: string | null

  @Column({ nullable: true, type: 'varchar' })
  city?: string | null

  @Column({ nullable: true, type: 'varchar', unique: true })
  @MinLength(10, { message: 'enter a valid phone number' })
  @Matches(/^(?!.*substring1|.*substring2).*/, {
    message: 'enter a valid phone number',
  })
  phone?: string | null

  @PrimaryColumn({ nullable: false, type: 'varchar', unique: true })
  @IsString()
  @IsNotEmpty()
  @IsEmail(undefined, { message: 'Provide valid email' })
  @Transform((param) => (param.value as string).toLowerCase())
  email?: string

  @Column({ nullable: true, type: 'varchar' })
  password?: string | null

  @Column({ nullable: true, type: 'varchar', unique: true })
  @Transform((param) => param.value.toLowerCase())
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  @NotContains(' ', {
    message: 'Username cannot contain spaces and must be unique',
  })
  username?: string | null

  @Column({
    type: 'enum',
    enum: UserRoleEnum,
    default: UserRoleEnum.USER,
  })
  role?: UserRoleEnum

  @Column({ nullable: false })
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  avatar?: string

  @Column({ nullable: false, default: 'INACTIVE' })
  @IsBoolean()
  status?: string

  @Column({ nullable: true, type: 'varchar' })
  gender?: string | null

  @Column({ nullable: true, type: 'date' })
  dob?: Date | null

  @Column({ nullable: true, default: null, type: 'varchar' })
  otp?: string | null

  @Column({ nullable: true, default: null, type: 'varchar' })
  otpExpires?: Date | null

  @Column({ nullable: false, default: '+234' })
  country_code?: string

  @CreateDateColumn()
  createdAt?: Date

  @UpdateDateColumn()
  updatedAt?: Date

  @Column({ unique: true, nullable: true, type: 'varchar' })
  googleId?: string | null

  @Column({ default: false })
  isGoogleUser?: boolean

  @Column({ default: false })
  isDisabled?: boolean

  @OneToMany(() => Schedule, (orders) => orders.user)
  orders?: Schedule[]

  @OneToOne(() => Wallet, (wallet) => wallet.user, { nullable: true })
  wallet?: Wallet

  @OneToMany(() => Transaction, (transaction) => transaction.user)
  transactions?: Transaction[]

  @OneToMany(() => Contribution, (contribution) => contribution.user)
  contributions?: Contribution[]

  @OneToMany(() => Redemption, (redemption) => redemption.user)
  redemptions?: Redemption[]

  static generateOTP(): string {
    const otpLength = 6
    const buffer = randomBytes(otpLength)
    return buffer
      .map((byte) => Math.floor((byte / 256.0) * 10))
      .join('')
      .slice(0, otpLength)
  }
}

export const validateOtp = (user: User, otp: string) => {
  //Check if the otp provided matches the stored OTP
  if (!user.otp || user.otp !== otp || !user.otpExpires) {
    return false
  }

  //check if otp has expired
  const now = new Date(Date.now())
  if (now.getTime() > new Date(user.otpExpires).getTime()) {
    return false
  }

  //if the OTP is valid and not expired, clear the OTP and the expiration
  user.otp = null
  user.otpExpires = null

  return true
}
