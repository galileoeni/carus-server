import bcrypt from 'bcryptjs'
import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import jwt from 'jsonwebtoken'

import { userRepository } from '../../auth/controllers'
import { User } from '../../entities/user'
import { generalResponse } from '../../helpers/constants'
import { sendVerificationOtp } from '../../helpers/emailService'
import { errorMessages } from '../../helpers/error-messages'
import generateToken from '../../helpers/generateToken'
import catchController from '../../utils/catchControllerAsyncs'
import { notificationService } from '../../services/notification.service'
import { NotificationType } from '../../entities/notification'

export const loginUser = catchController(
  async (req: Request, res: Response) => {
    const { identifier, password }: { identifier: string; password: string } =
      req.body

    //Check if both fields are passed
    if (!identifier || !password) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            'Email and password is required',
          ),
        )
    }

    // const userService = new UserService();
    // Check if the client's identifier (number or email) is contained in the database
    // const user = await userService.findByEmailOrNumber(identifier);

    const normalizePhoneNumber = (phoneNumber: string) => {
      // Remove leading '+' if present
      let normalizedNumber =
        phoneNumber.startsWith('+') || phoneNumber.startsWith('0')
          ? phoneNumber.slice(1)
          : phoneNumber
      // Remove leading '234' if present
      if (normalizedNumber.startsWith('234')) {
        normalizedNumber = normalizedNumber.slice(3)
      }
      return normalizedNumber
    }

    const emailUser = await userRepository.findOne({
      where: { email: identifier },
    })

    // const phoneUser =

    const user = emailUser
      ? emailUser
      : await userRepository.findOne({
          where: { phone: normalizePhoneNumber(identifier) },
        })

    //check if user is an admin // for now, allow admin to login
    // if (user?.role !== 'user') {
    //   return res
    //     .status(StatusCodes.NOT_FOUND)
    //     .json(
    //       generalResponse(
    //         StatusCodes.NOT_FOUND,
    //         {},
    //         [],
    //         errorMessages.INVALID_CREDENTIALS_ERROR,
    //       ),
    //     )
    // }

    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(
          generalResponse(
            StatusCodes.NOT_FOUND,
            {},
            [],
            errorMessages.INVALID_CREDENTIALS_ERROR,
          ),
        )
    }

    //Check if the password is a valid string and not undefined or null
    if (!user.password || typeof user.password !== 'string') {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(
          generalResponse(
            StatusCodes.UNAUTHORIZED,
            {},
            [],
            errorMessages.INVALID_CREDENTIALS_ERROR,
          ),
        )
    }

    //check if user account is disabled
    if (user.isDisabled) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(
          generalResponse(
            StatusCodes.UNAUTHORIZED,
            {},
            [],
            'Account disabled, contact support',
          ),
        )
    }

    if (user.status !== 'ACTIVE') {
      const otp = User.generateOTP()
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000)
      user.otp = otp
      user.otpExpires = otpExpires
      await userRepository.save(user)
      if (user.first_name && user.email) {
        await sendVerificationOtp(user.first_name, user.email, otp)
        return res
          .status(StatusCodes.UNAUTHORIZED)
          .json(
            generalResponse(
              StatusCodes.UNAUTHORIZED,
              {},
              [],
              'Please verify your email first',
            ),
          )
      }
    }

    //Compare the client's password with the one in the db
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1
      user.lastFailedLogin = new Date()
      await userRepository.save(user)

      if (user.failedLoginAttempts >= 3) {
        await notificationService.createNotification(
          user,
          'Security Alert',
          'There have been multiple failed login attempts on your account.',
          NotificationType.SECURITY_ALERT,
        )
      }

      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(
          generalResponse(
            StatusCodes.UNAUTHORIZED,
            {},
            [],
            errorMessages.INVALID_CREDENTIALS_ERROR,
          ),
        )
    }
    //What to do if the authentication is successful
    if (isPasswordValid && user.id) {
      user.failedLoginAttempts = 0
      await userRepository.save(user)

      const { token: refresh_token, token_expires: refresh_token_expires } =
        generateToken(user.id, 'refresh')
      const { token: access_token, token_expires: access_token_expires } =
        generateToken(user.id, 'access')
      res.status(StatusCodes.OK).json(
        generalResponse(
          StatusCodes.OK,
          {
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            role: user.role,
            status: user.status,
            refresh_token: refresh_token,
            refresh_token_expires: refresh_token_expires,
            access_token: access_token,
            access_token_expires: access_token_expires,
          },
          [],
          'User logged in successfully',
        ),
      )
    } else {
      console.log(
        '🚀 ~ Final error after passwordValid and user.id check:',
        res,
      )
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            'Something went wrong',
          ),
        )
    }
  },
)

export const getAccessToken = catchController(
  async (req: Request, res: Response) => {
    const { refreshToken }: { refreshToken: string | undefined } = req.body

    if (!refreshToken) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(StatusCodes.BAD_REQUEST, {}, [], 'Token is missing'),
        )
    }

    try {
      const decoded = <{ id: string; type: string }>(
        jwt.verify(refreshToken, process.env.JWT_SECRET as string)
      )

      if (decoded.type && decoded.type !== 'refresh') {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json(
            generalResponse(
              StatusCodes.BAD_REQUEST,
              {},
              [],
              'Invalid refresh token',
            ),
          )
      }

      const user = await userRepository.findOne({
        where: {
          id: decoded.id,
        },
      })

      if (!user) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json(
            generalResponse(
              StatusCodes.BAD_REQUEST,
              {},
              [],
              'Invalid refresh token',
            ),
          )
      }

      if (!user.id) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json(
            generalResponse(StatusCodes.NOT_FOUND, {}, [], 'User Id not found'),
          )
      }

      const { token: access_token, token_expires: access_token_expires } =
        generateToken(user.id, 'access')

      return res.status(StatusCodes.OK).json(
        generalResponse(
          StatusCodes.OK,
          {
            access_token: access_token,
            access_token_expires: access_token_expires,

            user: {
              id: user.id,
              username: user.username,
              first_name: user.first_name,
              last_name: user.last_name,
              email: user.email,
              status: user.status,
              phone: user.phone,
              address: user.address,
              role: user.role,
              avatar: user.avatar,
              gender: user.gender,
              city: user.city,
              region: user.region,
              created_at: user.createdAt,
              last_updated: user.updatedAt,
            },
          },
          [],
          'Access token generated successfully',
        ),
      )
    } catch {
      return res
        .status(StatusCodes.NOT_ACCEPTABLE)
        .json(
          generalResponse(StatusCodes.NOT_ACCEPTABLE, {}, [], 'Invalid token'),
        )
    }
  },
)
