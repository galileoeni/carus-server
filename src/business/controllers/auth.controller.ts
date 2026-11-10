import bcrypt from 'bcryptjs'
import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { EntityManager } from 'typeorm'

import { UserRoleEnum } from '../../@types/user'
import { AppDataSource } from '../../data-source'
import { BusinessProfile } from '../../entities/businessProfile'
import { NotificationType } from '../../entities/notification'
import { User, validateOtp } from '../../entities/user'
import { generalResponse } from '../../helpers/constants'
import { sendVerificationOtp } from '../../helpers/emailService'
import { errorMessages } from '../../helpers/error-messages'
import generateToken from '../../helpers/generateToken'
import { notificationService } from '../../services/notification.service'
import catchController from '../../utils/catchControllerAsyncs'
import { emailFormat } from '../../utils/email'
import { formatJoiError } from '../../utils/helper'
import { registerBusinessSchema } from '../../utils/validators/business'

const userRepository = AppDataSource.getRepository(User)
const profileRepository = AppDataSource.getRepository(BusinessProfile)

const respond = (
  res: Response,
  status: number,
  data: string | object,
  message: string,
) => res.status(status).json(generalResponse(status, data, [], message))

// Shape shared by /me and the verify response
export const formatBusiness = (
  user: User,
  profile: BusinessProfile | null,
) => ({
  id: user.id,
  email: user.email,
  first_name: user.first_name,
  last_name: user.last_name,
  phone: user.phone,
  country_code: user.country_code,
  avatar: user.avatar,
  status: user.status,
  role: user.role,
  business: profile && {
    companyName: profile.companyName,
    industry: profile.industry,
    cacNumber: profile.cacNumber,
    address: profile.address,
    city: profile.city,
    contactRole: profile.contactRole,
    wasteTypes: profile.wasteTypes,
    estimatedMonthlyKg: profile.estimatedMonthlyKg,
    createdAt: profile.createdAt,
    // Branches see pickups and data but not payments
    isBranch: !!profile.parent,
    branchName: profile.branchName ?? null,
    hq: profile.parent ? { companyName: profile.parent.companyName } : null,
  },
})

// Profile with its HQ (if it's a branch)
export const findProfile = (userId: string | undefined) =>
  profileRepository.findOne({
    where: { user: { id: userId } },
    relations: ['parent'],
  })

// Same form the login lookup uses (no leading +, 0 or 234)
export const normalisePhone = (phone: string) =>
  phone
    .replace(/\s+/g, '')
    .replace(/^\+/, '')
    .replace(/^234/, '')
    .replace(/^0/, '')

// Unsaved login for a new business account (HQ or branch)
export const newBusinessUser = (
  manager: EntityManager,
  v: {
    email: string
    phone: string
    password: string
    first_name: string
    last_name: string
    country_code: string
    city: string
    address: string
    avatarSeed: string
    otp: string
  },
) =>
  manager.create(User, {
    role: UserRoleEnum.BUSINESS,
    email: v.email,
    password: v.password,
    first_name: v.first_name,
    last_name: v.last_name,
    phone: v.phone,
    country_code: v.country_code,
    city: v.city,
    address: v.address,
    avatar: `https://robohash.org/${encodeURIComponent(
      v.avatarSeed,
    )}?set=3&size=500x500`,
    otp: v.otp,
    otpExpires: new Date(Date.now() + 10.5 * 60 * 1000),
    isGoogleUser: false,
  })

// Why a new login can't use this email or phone, if it can't
export const loginTakenError = async (email: string, phone: string) => {
  if (await userRepository.findOne({ where: { email } })) {
    return 'This email is already taken'
  }
  if (await userRepository.findOneBy({ phone })) {
    return 'This phone number is already linked to another account'
  }
  return null
}

export const registerBusiness = catchController(
  async (req: Request, res: Response) => {
    const { error, value } = registerBusinessSchema.validate(req.body)
    if (error) {
      const { details, message } = formatJoiError(error)
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(generalResponse(StatusCodes.BAD_REQUEST, {}, details, message))
    }

    const email = value.email.toLowerCase()
    const phone = normalisePhone(value.phone)
    const taken = await loginTakenError(email, phone)
    if (taken) return respond(res, StatusCodes.CONFLICT, {}, taken)

    const otp = User.generateOTP()
    await AppDataSource.transaction(async (manager) => {
      const user = newBusinessUser(manager, {
        ...value,
        email,
        phone,
        password: await bcrypt.hash(value.password, 10),
        avatarSeed: value.companyName,
        otp,
      })
      await manager.save(user)

      await manager.save(
        manager.create(BusinessProfile, {
          user,
          companyName: value.companyName,
          industry: value.industry,
          cacNumber: value.cacNumber || null,
          address: value.address,
          city: value.city,
          contactRole: value.contactRole || null,
          wasteTypes: value.wasteTypes,
          estimatedMonthlyKg: value.estimatedMonthlyKg ?? null,
        }),
      )
    })

    sendVerificationOtp(value.first_name, email, otp)

    return respond(
      res,
      StatusCodes.CREATED,
      {},
      `Business account created, kindly verify your email ${emailFormat(
        email,
      )}`,
    )
  },
)

export const verifyBusinessEmail = catchController(
  async (req: Request, res: Response) => {
    const { otp, identifier }: { otp?: string; identifier?: string } =
      req.body ?? {}
    if (!identifier || !otp) {
      return respond(
        res,
        StatusCodes.BAD_REQUEST,
        {},
        errorMessages.PASS_REQUIRED_FIELDS_ERROR,
      )
    }

    const user = await userRepository.findOne({
      where: { email: identifier.trim().toLowerCase() },
    })
    if (!user || user.role !== UserRoleEnum.BUSINESS) {
      return respond(
        res,
        StatusCodes.NOT_FOUND,
        {},
        errorMessages.USER_NOT_FOUND_ERROR,
      )
    }
    if (user.status === 'ACTIVE') {
      return respond(
        res,
        StatusCodes.BAD_REQUEST,
        {},
        'Account has already been verified',
      )
    }
    if (!validateOtp(user, otp) || !user.id) {
      return respond(
        res,
        StatusCodes.BAD_REQUEST,
        {},
        'OTP is incorrect or has expired',
      )
    }

    user.status = 'ACTIVE'
    await userRepository.save(user)

    const profile = await findProfile(user.id)
    await notificationService.createNotification(
      user,
      'Welcome to Carus for Business!',
      `Hi ${user.first_name}, ${
        profile?.companyName ?? 'your business'
      } is all set up on Carus.`,
      NotificationType.WELCOME,
    )

    const refresh = generateToken(user.id, 'refresh')
    const access = generateToken(user.id, 'access')
    return respond(
      res,
      StatusCodes.OK,
      {
        ...formatBusiness(user, profile),
        refresh_token: refresh.token,
        refresh_token_expires: refresh.token_expires,
        access_token: access.token,
        access_token_expires: access.token_expires,
      },
      'Email verified successfully',
    )
  },
)

export const getBusinessMe = catchController(
  async (req: Request, res: Response) => {
    // Set by verifyBusiness
    const user = req.user as User
    const profile = await findProfile(user.id)
    return respond(
      res,
      StatusCodes.OK,
      formatBusiness(user, profile),
      'Success',
    )
  },
)
