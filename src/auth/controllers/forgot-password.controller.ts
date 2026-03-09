import bcrypt from 'bcryptjs'
import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { userRepository } from '../../auth/controllers'
import { User, validateOtp } from '../../entities/user'
import { generalResponse } from '../../helpers/constants'
import {
  sendPasswordResetToken,
  sendVerificationOtp,
} from '../../helpers/emailService'
import { errorMessages } from '../../helpers/error-messages'
import {
  generateEmailVerificationToken,
  verifyEmailVerificationToken,
} from '../../helpers/generateToken'
import catchController from '../../utils/catchControllerAsyncs'

export const resendOtp = catchController(
  async (req: Request, res: Response) => {
    const { email }: { email: string } = req.body

    //check if email is passed
    if (!email) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            errorMessages.PASS_REQUIRED_FIELDS_ERROR,
          ),
        )
    }

    const user = await userRepository.findOneBy({ email })

    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(
          generalResponse(
            StatusCodes.NOT_FOUND,
            {},
            [],
            errorMessages.USER_NOT_FOUND_ERROR,
          ),
        )
    }

    const otp = User.generateOTP()
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000)

    user.otp = otp
    user.otpExpires = otpExpires

    await userRepository.save(user)

    if (user.first_name) {
      await sendVerificationOtp(user.first_name, email, otp)
    }
    return res
      .status(StatusCodes.OK)
      .json(
        generalResponse(
          StatusCodes.OK,
          {},
          [],
          'New OTP has been sent to your email',
        ),
      )
  },
)

export const forgotPassword = catchController(
  async (req: Request, res: Response) => {
    const { email }: { email: string } = req.body
    //check if email is passed
    if (!email) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            errorMessages.PASS_REQUIRED_FIELDS_ERROR,
          ),
        )
    }

    const user = await userRepository.findOneBy({ email })

    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(
          generalResponse(
            StatusCodes.NOT_FOUND,
            {},
            [],
            errorMessages.USER_NOT_FOUND_ERROR,
          ),
        )
    }

    const otp = User.generateOTP()
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000)

    user.otp = otp
    user.otpExpires = otpExpires

    await userRepository.save(user)

    const token = generateEmailVerificationToken(email, otp)

    if (user.first_name) {
      await sendPasswordResetToken(user.first_name, email, token)
    }
    return res
      .status(StatusCodes.OK)
      .json(
        generalResponse(
          StatusCodes.OK,
          {},
          [],
          'A password reset link has been sent to your mail',
        ),
      )
  },
)

export const confirmForgotPassword = catchController(
  async (req: Request, res: Response) => {
    const { otp, email }: { otp: string; email: string } = req.body

    //check if email and otp is passed
    if (!email || !otp) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            errorMessages.PASS_REQUIRED_FIELDS_ERROR,
          ),
        )
    }

    const user = await userRepository.findOneBy({ email })

    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(
          generalResponse(
            StatusCodes.NOT_FOUND,
            {},
            [],
            errorMessages.USER_NOT_FOUND_ERROR,
          ),
        )
    }

    //verify otp
    if (validateOtp(user, otp)) {
      return res
        .status(StatusCodes.OK)
        .json(
          generalResponse(StatusCodes.OK, {}, [], 'OTP validation successfull'),
        )
    } else {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            'OTP is invalid or has expired',
          ),
        )
    }
  },
)

export const resetPassword = catchController(
  async (req: Request, res: Response) => {
    const { token, newPassword }: { token: string; newPassword: string } =
      req.body

    //Check if required parameters are passed
    if (!token || !newPassword) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            errorMessages.PASS_REQUIRED_FIELDS_ERROR,
          ),
        )
    }
    const payload = verifyEmailVerificationToken(token)
    const { email, otp } = payload
    const user = await userRepository.findOneBy({ email })

    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(
          generalResponse(
            StatusCodes.NOT_FOUND,
            {},
            [],
            errorMessages.USER_NOT_FOUND_ERROR,
          ),
        )
    }

    const passwordRegex =
      /^(?=.*[A-Z])(?=.*[a-z])(?=.*[!@#$%^&*()_+,-./:;<=>?@[\\\]^_`{|}~])(?=.{8,})/
    if (!newPassword.match(passwordRegex)) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            errorMessages.PASSWORD_REGEX_ERROR,
          ),
        )
    }

    //verify otp
    if (!validateOtp(user, otp)) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            'OTP is incorrect or has expired',
          ),
        )
    }

    if (user.password) {
      const isOldPassword = await bcrypt.compare(newPassword, user.password)
      if (isOldPassword) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json(
            generalResponse(
              StatusCodes.BAD_REQUEST,
              {},
              [],
              'New password cannot be the same as old password',
            ),
          )
      }
    }

    user.password = await bcrypt.hash(newPassword, 10)
    await userRepository.save(user)
    res
      .status(StatusCodes.OK)
      .json(generalResponse(StatusCodes.OK, {}, [], 'Password has been reset'))
  },
)
