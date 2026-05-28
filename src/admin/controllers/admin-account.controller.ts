import bcrypt from 'bcryptjs'
import { isEmail } from 'class-validator'
import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { UserRoleEnum, UserRow } from '../../@types/user'
import { userRepository, walletRepository } from '../../auth/controllers'
import { validateOtp } from '../../entities/user'
import { Wallet } from '../../entities/wallet'
import { AppDataSource } from '../../data-source'
import { Transaction, TransactionType, TransactionDirection, TransactionStatus } from '../../entities/transactions'
import { Configurations } from '../../entities/configurations'
import { generalResponse, passwordRegex } from '../../helpers/constants'
import { errorMessages } from '../../helpers/error-messages'
import generateToken from '../../helpers/generateToken'
import catchController from '../../utils/catchControllerAsyncs'
import { emailFormat } from '../../utils/email'

export const createAdmin = catchController(
  async (req: Request, res: Response) => {
    const {
      first_name,
      last_name,
      gender,
      email,
      phone,
      password,
      country_code,
      admin_type,
    } = req.body as UserRow & { admin_type?: 'master' | 'base' }

    // Check if all fields are passed
    const requiredFields = ['password', 'email', 'first_name', 'last_name']
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

    //make sure phone number is valid
    if (phone && phone.length < 5) {
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
    if (phone) {
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
    const dob = dateString ? new Date(dateString) : null

    // if the request meets all the requirements then...
    // generate a random whole number between 1 and 4 icluding 1 and 4
    const randomNumber = Math.floor(Math.random() * (4 - 1 + 1)) + 1
    const avatar = `https://robohash.org/${first_name}?set=${randomNumber}&size=500x500`
    const role = UserRoleEnum.ADMIN

    //create a new user
    const newUser = userRepository.create({
      avatar: avatar,
      role: role,
      email: email,
      password: hashedPassword,
      first_name: first_name,
      last_name: last_name,
      phone: phone || null,
      gender: gender || null,
      dob: dob,
      country_code: country_code || '+234',
      status: 'ACTIVE',
      admin_type: admin_type || 'base',
    })

    //save the user
    await userRepository.save(newUser)

    const maskedEmail = emailFormat(email)
    return res
      .status(StatusCodes.CREATED)
      .json(
        generalResponse(
          StatusCodes.CREATED,
          {},
          [],
          `Admin created successfully, kindly verify your email ${maskedEmail}`,
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
      if (user.role !== UserRoleEnum.USER) {
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

export const removeAdmin = async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const user = await userRepository.findOne({ where: { id: id.toString() } })

    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(generalResponse(StatusCodes.NOT_FOUND, {}, [], 'User not found'))
    }

    user.role = UserRoleEnum.USER
    const updatedUser = await userRepository.save(user)

    return res
      .status(StatusCodes.OK)
      .json(
        generalResponse(
          StatusCodes.OK,
          updatedUser,
          [],
          'Admin role removed successfully',
        ),
      )
  } catch (error) {
    console.error(error)
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(
        generalResponse(
          StatusCodes.INTERNAL_SERVER_ERROR,
          {},
          [],
          'An error occurred',
        ),
      )
  }
}

export const assignAdmin = async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const user = await userRepository.findOne({ where: { id: id.toString() } })

    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(generalResponse(StatusCodes.NOT_FOUND, {}, [], 'User not found'))
    }

    user.role = UserRoleEnum.ADMIN
    const updatedUser = await userRepository.save(user)

    return res
      .status(StatusCodes.OK)
      .json(
        generalResponse(
          StatusCodes.OK,
          updatedUser,
          [],
          'Admin role assigned successfully',
        ),
      )
  } catch (error) {
    console.error(error)
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(
        generalResponse(
          StatusCodes.INTERNAL_SERVER_ERROR,
          {},
          [],
          'An error occurred',
        ),
      )
  }
}

export const promoteToMasterAdmin = async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const user = await userRepository.findOne({ where: { id: id.toString() } })

    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(generalResponse(StatusCodes.NOT_FOUND, {}, [], 'User not found'))
    }

    if (user.role !== UserRoleEnum.ADMIN) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(generalResponse(StatusCodes.BAD_REQUEST, {}, [], 'User must be an admin to be promoted to master admin'))
    }

    user.admin_type = 'master'
    const updatedUser = await userRepository.save(user)

    return res
      .status(StatusCodes.OK)
      .json(
        generalResponse(
          StatusCodes.OK,
          updatedUser,
          [],
          'Admin promoted to Master Admin successfully',
        ),
      )
  } catch (error) {
    console.error(error)
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(
        generalResponse(
          StatusCodes.INTERNAL_SERVER_ERROR,
          {},
          [],
          'An error occurred',
        ),
      )
  }
}

export const demoteToBaseAdmin = async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const user = await userRepository.findOne({ where: { id: id.toString() } })

    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(generalResponse(StatusCodes.NOT_FOUND, {}, [], 'User not found'))
    }

    if (user.role !== UserRoleEnum.ADMIN) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(generalResponse(StatusCodes.BAD_REQUEST, {}, [], 'User must be an admin to be demoted to base admin'))
    }

    user.admin_type = 'base'
    const updatedUser = await userRepository.save(user)

    return res
      .status(StatusCodes.OK)
      .json(
        generalResponse(
          StatusCodes.OK,
          updatedUser,
          [],
          'Admin demoted to Base Admin successfully',
        ),
      )
  } catch (error) {
    console.error(error)
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(
        generalResponse(
          StatusCodes.INTERNAL_SERVER_ERROR,
          {},
          [],
          'An error occurred',
        ),
      )
  }
}

export const assignSuperAdmin = async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const user = await userRepository.findOne({ where: { id: id.toString() } })

    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(generalResponse(StatusCodes.NOT_FOUND, {}, [], 'User not found'))
    }

    user.role = UserRoleEnum.SUPERADMIN
    const updatedUser = await userRepository.save(user)

    return res
      .status(StatusCodes.OK)
      .json(
        generalResponse(
          StatusCodes.OK,
          updatedUser,
          [],
          'SuperAdmin role assigned successfully',
        ),
      )
  } catch (error) {
    console.error(error)
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(
        generalResponse(
          StatusCodes.INTERNAL_SERVER_ERROR,
          {},
          [],
          'An error occurred',
        ),
      )
  }
}

export const removeSuperAdmin = async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const user = await userRepository.findOne({ where: { id: id.toString() } })

    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(generalResponse(StatusCodes.NOT_FOUND, {}, [], 'User not found'))
    }

    user.role = UserRoleEnum.ADMIN
    const updatedUser = await userRepository.save(user)

    return res
      .status(StatusCodes.OK)
      .json(
        generalResponse(
          StatusCodes.OK,
          updatedUser,
          [],
          'SuperAdmin role removed, downgraded to Admin',
        ),
      )
  } catch (error) {
    console.error(error)
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(
        generalResponse(
          StatusCodes.INTERNAL_SERVER_ERROR,
          {},
          [],
          'An error occurred',
        ),
      )
  }
}

export const deactivateUser = catchController(
  async (req: Request, res: Response) => {
    const { id } = req.params

    const user = await userRepository.findOne({ where: { id: id.toString() } })

    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(generalResponse(StatusCodes.NOT_FOUND, {}, [], 'User not found'))
    }

    user.status = 'DEACTIVATED'
    user.isDisabled = true
    const updatedUser = await userRepository.save(user)

    return res
      .status(StatusCodes.OK)
      .json(
        generalResponse(
          StatusCodes.OK,
          updatedUser,
          [],
          'User account deactivated successfully',
        ),
      )
  },
)

export const manualPayment = catchController(
  async (req: Request, res: Response) => {
    const { id } = req.params
    const { amount, description } = req.body

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            'Please provide a valid positive amount',
          ),
        )
    }

    const user = await userRepository.findOne({
      where: { id: id.toString() },
      relations: { wallet: true },
    })

    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(generalResponse(StatusCodes.NOT_FOUND, {}, [], 'User not found'))
    }

    const transactionRepository = AppDataSource.getRepository(Transaction)
    const configurationRepository = AppDataSource.getRepository(Configurations)

    const pointToNaira = await configurationRepository.findOne({
      where: { type: 'point_to_naira' },
    })
    const rate = parseFloat(pointToNaira?.value || '10')

    // Convert Naira amount to Points
    const pointsToAdd = parsedAmount * rate

    let wallet = user.wallet
    if (!wallet) {
      // Create wallet if it doesn't exist
      const walletRepository = AppDataSource.getRepository(Wallet)
      wallet = walletRepository.create({
        user: user,
        points: 0,
      })
      await walletRepository.save(wallet)
    }

    wallet.points = Number(wallet.points || 0) + pointsToAdd
    const walletRepository = AppDataSource.getRepository(Wallet)
    await walletRepository.save(wallet)

    // Save credit transaction
    const transaction = new Transaction()
    transaction.user = user
    transaction.date = new Date()
    transaction.type = TransactionType.CASH
    transaction.direction = TransactionDirection.CREDIT
    transaction.amount = parsedAmount
    transaction.charges = 0
    transaction.status = TransactionStatus.COMPLETED
    transaction.description = description || `Manual wallet adjustment / payment credit of ₦${parsedAmount.toLocaleString()}`
    transaction.wallet = wallet
    await transactionRepository.save(transaction)

    return res
      .status(StatusCodes.OK)
      .json(
        generalResponse(
          StatusCodes.OK,
          {
            points: wallet.points,
            naira_amount: wallet.points / rate,
          },
          [],
          `User payment updated successfully. Wallet credited with ${pointsToAdd} points (₦${parsedAmount.toLocaleString()}).`,
        ),
      )
  },
)
