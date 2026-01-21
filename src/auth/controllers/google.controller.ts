import axios from 'axios'
import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { UserRoleEnum, UserRow } from '../../@types/user'
import { userRepository, walletRepository } from '../../auth/controllers'
import { Wallet } from '../../entities/wallet'
import { generalResponse } from '../../helpers/constants'
import { errorMessages } from '../../helpers/error-messages'
import generateToken from '../../helpers/generateToken'
import catchController from '../../utils/catchControllerAsyncs'

export const googleAuth = catchController(
  async (req: Request, res: Response) => {
    const { token }: { token: string } = req.body

    // const encodedToken = encodeURIComponent(token)

    if (!token || typeof token !== 'string') {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json(
          generalResponse(
            StatusCodes.FORBIDDEN,
            {},
            [],
            'Invalid token or token missing',
          ),
        )
    }

    const {
      data: googleInfo,
    }: {
      data: {
        id: string
        email: string
        verified_email: boolean
        name: string
        given_name: string
        family_name: string
        picture: string
        locale: string
      }
    } = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const user = await userRepository.findOne({
      where: { email: googleInfo.email },
    })

    if (user && !user.googleId) {
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

    if (user && user.status === 'INACTIVE') {
      return res.status(StatusCodes.CREATED).json(
        generalResponse(
          StatusCodes.CREATED,
          {
            email: user.email,
          },
          [],
          'Complete google signup process',
        ),
      )
    }

    if (user && user.id && user.status === 'ACTIVE') {
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
            avatar: user.avatar,
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
    }

    const role = UserRoleEnum.USER
    const email = googleInfo.email
    const first_name = googleInfo.given_name
    const avatar = googleInfo.picture
    const last_name = googleInfo.family_name
    const googleId = googleInfo.id

    const newUser = userRepository.create({
      avatar: avatar,
      role: role,
      email: email,
      first_name: first_name,
      last_name: last_name,
      googleId: googleId,
      isGoogleUser: true,
    })

    await userRepository.save(newUser)

    return res
      .status(StatusCodes.CREATED)
      .json(
        generalResponse(
          StatusCodes.CREATED,
          { email: googleInfo.email },
          [],
          `User signed up successfully, kindly complete your profile`,
        ),
      )
  },
)

export const completeGoogleSignupProfile = catchController(
  async (req: Request, res: Response) => {
    const { email, gender, phone, country_code } = req.body as UserRow

    const requiredFields = ['email', 'gender', 'dob', 'phone', 'country_code']

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

    const user = await userRepository.findOne({
      where: { email: email },
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

    if (!user.googleId) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            errorMessages.USER_NOT_FOUND_ERROR,
          ),
        )
    }

    const dateString = req.body.dob

    const dob = new Date(dateString)

    //make sure phone number is valid
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

    if (user.id) {
      const { token: refresh_token, token_expires: refresh_token_expires } =
        generateToken(user.id, 'refresh')
      const { token: access_token, token_expires: access_token_expires } =
        generateToken(user.id, 'access')
      user.status = 'ACTIVE'
      user.phone = phone
      user.dob = dob
      user.country_code = country_code
      user.gender = gender
      if (user.role === 'user') {
        const existingWallet = await walletRepository.findOne({
          where: { user: { id: user.id } },
        })
        if (!existingWallet) {
          const wallet = new Wallet()
          wallet.user = user
          wallet.updatedAt = new Date(Date.now())
          await walletRepository.save(wallet)
        }
        await userRepository.save(user)
        return res.status(StatusCodes.OK).json(
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
              country_code: country_code,
            },
            [],
            'Your Email has been verified',
          ),
        )
      }
    } else {
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
  },
)
