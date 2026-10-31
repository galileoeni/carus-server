import bcrypt from 'bcryptjs'
import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

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
  },
})

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
    // Same form the login lookup uses (no leading +, 0 or 234)
    const phone = value.phone
      .replace(/\s+/g, '')
      .replace(/^\+/, '')
      .replace(/^234/, '')
      .replace(/^0/, '')
    if (await userRepository.findOne({ where: { email } })) {
      return respond(
        res,
        StatusCodes.CONFLICT,
        {},
        'This email is already taken',
      )
    }
    if (await userRepository.findOneBy({ phone })) {
      return respond(
        res,
        StatusCodes.CONFLICT,
        {},
        'This phone number is already linked to another account',
      )
    }

    const otp = User.generateOTP()
    await AppDataSource.transaction(async (manager) => {
      const user = manager.create(User, {
        role: UserRoleEnum.BUSINESS,
        email,
        password: await bcrypt.hash(value.password, 10),
        first_name: value.first_name,
        last_name: value.last_name,
        phone,
        country_code: value.country_code,
        city: value.city,
        address: value.address,
        avatar: `https://robohash.org/${encodeURIComponent(
          value.companyName,
        )}?set=3&size=500x500`,
        otp,
        otpExpires: new Date(Date.now() + 10.5 * 60 * 1000),
        isGoogleUser: false,
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

    const profile = await profileRepository.findOne({
      where: { user: { id: user.id } },
    })
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
    const profile = await profileRepository.findOne({
      where: { user: { id: user.id } },
    })
    return respond(
      res,
      StatusCodes.OK,
      formatBusiness(user, profile),
      'Success',
    )
  },
)
