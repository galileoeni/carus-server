import bcrypt from 'bcryptjs'
import { isEmail } from 'class-validator'
import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { userRepository, walletRepository } from '.'
import { UserRoleEnum, UserRow } from '../../@types/user'
import { User, validateOtp } from '../../entities/user'
import { Wallet } from '../../entities/wallet'
import { generalResponse, passwordRegex } from '../../helpers/constants'
import { sendVerificationOtp } from '../../helpers/emailService'
import { errorMessages } from '../../helpers/error-messages'
import generateToken from '../../helpers/generateToken'
import catchController from '../../utils/catchControllerAsyncs'
import { emailFormat } from '../../utils/email'

export const createUser = catchController(
  async (req: Request, res: Response) => {
    const {
      first_name,
      last_name,
      gender,
      email,
      phone,
      password,
      country_code,
    } = req.body as UserRow

    // Check if all fields are passed
    const requiredFields = [
      'password',
      'email',
      'first_name',
      'last_name',
      'phone',
      'gender',
      'dob',
      'country_code',
    ]
    if (requiredFields.some((field) => !req.body[field])) {
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

    //Check if email already exists
    const existingEmail = await userRepository.findOne({
      where: { email: email },
    })

    if (existingEmail) {
      return res
        .status(StatusCodes.CONFLICT)
        .json(
          generalResponse(
            StatusCodes.CONFLICT,
            {},
            [],
            'This email is already taken',
          ),
        )
    }

    //make sure email is valid
    if (!isEmail(email)) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            'Please enter a valid email address',
          ),
        )
    }

    //make sure phone number is valid
    // const phoneRegex = /^[0-9]{10}$/
    // if (!phone.match(phoneRegex)) {
    //     return res
    //         .status(StatusCodes.BAD_REQUEST)
    //         .json(
    //             generalResponse(
    //                 StatusCodes.BAD_REQUEST,
    //                 {},
    //                 [],
    //                 'Please enter a valid phone number',
    //             ),
    //         )
    // }

    if (phone.length < 5) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            'Please enter a valid phone number',
          ),
        )
    }

    //check if phone number is linked to another account
    const existingPhone = await userRepository.findOneBy({ phone })
    if (existingPhone) {
      return res
        .status(StatusCodes.CONFLICT)
        .json(
          generalResponse(
            StatusCodes.CONFLICT,
            {},
            [],
            'This phone number is already linked to another account',
          ),
        )
    }

    if (!password) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            'Password is a required field',
          ),
        )
    }

    //Check if password has 8 characters, one lowercase, one uppercase and one symbol
    if (!password.match(passwordRegex)) {
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
    const hashedPassword = await bcrypt.hash(password, 10)

    const dateString = req.body.dob

    const dob = new Date(dateString)

    // if the request meets all the requirements then...
    // generate a random whole number between 1 and 4 icluding 1 and 4
    const randomNumber = Math.floor(Math.random() * (4 - 1 + 1)) + 1
    const avatar = `https://robohash.org/${first_name}?set=${randomNumber}&size=500x500`
    const role = UserRoleEnum.USER

    // Create Otp
    const otp = User.generateOTP()
    const otpExpires = new Date(Date.now() + 10.5 * 60 * 1000)

    //create a new user
    const newUser = userRepository.create({
      avatar: avatar,
      role: role,
      email: email,
      password: hashedPassword,
      first_name: first_name,
      last_name: last_name,
      phone: phone,
      gender: gender,
      dob: dob,
      otp: otp,
      otpExpires: otpExpires,
      country_code: country_code,
      isGoogleUser: false,
    })

    //save the user
    await userRepository.save(newUser)

    //Send Otp
    sendVerificationOtp(first_name, email, otp)

    const maskedEmail = emailFormat(email)
    return res
      .status(StatusCodes.CREATED)
      .json(
        generalResponse(
          StatusCodes.CREATED,
          {},
          [],
          `User signed up successfully, kindly verify your email ${maskedEmail}`,
        ),
      )
  },
)

export const verifyUserEmail = catchController(
  async (req: Request, res: Response) => {
    const { otp, identifier }: { otp: string; identifier: string } = req.body
    //check if email and otp is passed
    if (!identifier || !otp) {
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

    const user = await userRepository.findOne({
      where: { email: identifier },
    })

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

    if (user.googleId) {
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

    if (user.status === 'ACTIVE') {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            'Account has already been verified',
          ),
        )
    }

    //verify otp
    if (validateOtp(user, otp) && user.id) {
      const { token: refresh_token, token_expires: refresh_token_expires } =
        generateToken(user.id, 'refresh')
      const { token: access_token, token_expires: access_token_expires } =
        generateToken(user.id, 'access')
      user.status = 'ACTIVE'
      await userRepository.save(user)
      if (user.role !== 'user') {
        return res
          .status(StatusCodes.FORBIDDEN)
          .json(
            generalResponse(
              StatusCodes.FORBIDDEN,
              {},
              [],
              errorMessages.INVALID_CREDENTIALS_ERROR,
            ),
          )
      }
      // Find an existing wallet for the user
      const existingWallet = await walletRepository.findOne({
        where: { user: { id: user.id } },
      })

      // Only create a new wallet if one does not already exist
      if (!existingWallet) {
        const wallet = new Wallet()
        wallet.user = user
        wallet.updatedAt = new Date(Date.now())
        await walletRepository.save(wallet)
      }
      return res.status(StatusCodes.OK).json(
        generalResponse(
          StatusCodes.OK,
          {
            username: user.username,
            email: user.email,
            status: user.status,
            refresh_token: refresh_token,
            refresh_token_expires: refresh_token_expires,
            access_token: access_token,
            access_token_expires: access_token_expires,
          },
          [],
          'Email verified successfully',
        ),
      )
    } else {
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
  },
)
