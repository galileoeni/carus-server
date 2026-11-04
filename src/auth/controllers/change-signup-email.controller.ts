import bcrypt from 'bcryptjs'
import { isEmail } from 'class-validator'
import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { userRepository } from '.'
import { User } from '../../entities/user'
import { generalResponse } from '../../helpers/constants'
import { sendVerificationOtp } from '../../helpers/emailService'
import { errorMessages } from '../../helpers/error-messages'
import catchController from '../../utils/catchControllerAsyncs'
import { emailFormat } from '../../utils/email'

const respond = (res: Response, status: number, message: string) =>
  res.status(status).json(generalResponse(status, {}, [], message))

// Lets someone who mistyped their email at sign-up fix it before verifying.
// They prove it's their account with the password they just chose; a new
// code is then sent to the corrected address. Verified accounts can't use
// this.
export const changeSignupEmail = catchController(
  async (req: Request, res: Response) => {
    const { email, newEmail, password } = (req.body ?? {}) as {
      email?: string
      newEmail?: string
      password?: string
    }
    if (!email || !newEmail || !password) {
      return respond(
        res,
        StatusCodes.BAD_REQUEST,
        errorMessages.PASS_REQUIRED_FIELDS_ERROR,
      )
    }

    const current = email.trim()
    const corrected = newEmail.trim().toLowerCase()
    if (!isEmail(corrected)) {
      return respond(
        res,
        StatusCodes.BAD_REQUEST,
        'Please enter a valid email address',
      )
    }

    // Older customer sign-ups kept the email as typed
    const user =
      (await userRepository.findOneBy({ email: current })) ??
      (await userRepository.findOneBy({ email: current.toLowerCase() }))

    const passwordOk =
      !!user?.password &&
      !user.isGoogleUser &&
      (await bcrypt.compare(password, user.password))
    if (!user || !passwordOk) {
      return respond(
        res,
        StatusCodes.UNAUTHORIZED,
        errorMessages.INVALID_CREDENTIALS_ERROR,
      )
    }
    if (user.status === 'ACTIVE') {
      return respond(
        res,
        StatusCodes.BAD_REQUEST,
        'This account is already verified. Please log in.',
      )
    }
    if (corrected === user.email) {
      return respond(
        res,
        StatusCodes.BAD_REQUEST,
        'That is the same email address',
      )
    }
    if (await userRepository.findOneBy({ email: corrected })) {
      return respond(res, StatusCodes.CONFLICT, 'This email is already taken')
    }

    const otp = User.generateOTP()
    try {
      // email is part of the user's key; linked rows follow via
      // ON UPDATE CASCADE (an unverified account only has a business profile)
      await userRepository.update(
        { id: user.id },
        {
          email: corrected,
          otp,
          otpExpires: new Date(Date.now() + 10.5 * 60 * 1000),
        },
      )
    } catch (err) {
      console.error('Could not change sign-up email', err)
      return respond(
        res,
        StatusCodes.CONFLICT,
        "We couldn't change this email. Please contact support.",
      )
    }

    sendVerificationOtp(user.first_name ?? '', corrected, otp)

    return res
      .status(StatusCodes.OK)
      .json(
        generalResponse(
          StatusCodes.OK,
          { email: corrected },
          [],
          `Email updated. We sent a new code to ${emailFormat(corrected)}`,
        ),
      )
  },
)
