import bcrypt from 'bcryptjs'
import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { CityEnum, RegionEnum } from '../../@types/user'
import { AppDataSource } from '../../data-source'
import { Configurations } from '../../entities/configurations'
import { Contact } from '../../entities/contact'
import { User } from '../../entities/user'
import { Wallet } from '../../entities/wallet'
import {
  generalResponse,
  returnSuccess,
  userNotFound,
} from '../../helpers/constants'
import { errorMessages } from '../../helpers/error-messages'
import catchController from '../../utils/catchControllerAsyncs'
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from '../../utils/cloudinary'
import { notificationService } from '../../services/notification.service'
import { NotificationType } from '../../entities/notification'

const regionList = Object.values(RegionEnum).join(', ')
const cityList = Object.values(CityEnum).join(', ')

export const getAccount = catchController(
  async (req: Request, res: Response) => {
    const user: User | undefined = req.user

    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(generalResponse(StatusCodes.NOT_FOUND, {}, [], userNotFound))
    }

    const walletRepository = AppDataSource.getRepository(Wallet)
    const configurationRepository = AppDataSource.getRepository(Configurations)

    const wallet = await walletRepository.findOne({
      relations: {
        user: true,
      },
      where: {
        user: {
          id: user.id,
        },
      },
    })
    const pointToNaira = await configurationRepository.findOne({
      where: { type: 'point_to_naira' },
    })
    const points = wallet?.points ?? 0
    const rate = parseFloat(pointToNaira?.value ?? '1')
    const nairaAmount = rate > 0 ? points / rate : 0

    res.status(StatusCodes.OK).json(
      generalResponse(
        StatusCodes.OK,
        {
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
          wallet: {
            id: wallet?.id,
            naira_amount: nairaAmount,
            points: wallet?.points,
            last_transaction_time: wallet?.updatedAt,
            point_to_naira: pointToNaira?.value,
          },
        },
        [],
        returnSuccess,
      ),
    )
  },
)

export const editProfile = catchController(
  // eslint-disable-next-line sonarjs/cognitive-complexity
  async (req: Request, res: Response) => {
    // console.log("🚀 ~ req.body:", req.body)
    // console.log('🚀 ~ req.file:', req.file)
    const user: User | undefined = req.user
    const userRepository = AppDataSource.getRepository(User)

    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(generalResponse(StatusCodes.NOT_FOUND, '', [], userNotFound))
    }

    if (req.body.username) {
      const existingUsername = await userRepository.findOne({
        where: {
          username: req.body.username,
        },
      })

      if (existingUsername) {
        return res
          .status(StatusCodes.CONFLICT)
          .json(
            generalResponse(
              StatusCodes.CONFLICT,
              {},
              [],
              'This username is already taken',
            ),
          )
      }

      if (req.body.username.includes(' ') || req.body.username.length < 3) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json(
            generalResponse(
              StatusCodes.BAD_REQUEST,
              {},
              [],
              'Please make sure username does not contain spaces and has 3 or more characters',
            ),
          )
      }

      if (existingUsername != req.body.username && req.body.username === '') {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json(
            generalResponse(
              StatusCodes.BAD_REQUEST,
              {},
              [],
              'Username cannot be empty',
            ),
          )
      }

      user.username = req.body.username
    }

    if (req.file) {
      if (user.avatar) {
        const publicId = user.avatar.split('/').pop()?.split('.')[0]
        if (publicId) {
          await deleteFromCloudinary(`avatars/${publicId}`)
        }
      }
      
      try {
        const fileStr = `data:${
          req.file.mimetype
        };base64,${req.file.buffer.toString('base64')}`
        const uploadResult = await uploadToCloudinary(fileStr, 'avatars')
        
        if (!uploadResult?.secure_url) {
          return res
            .status(StatusCodes.INTERNAL_SERVER_ERROR)
            .json(
              generalResponse(
                StatusCodes.INTERNAL_SERVER_ERROR,
                {},
                [],
                'Failed to upload avatar to cloud storage',
              ),
            )
        }
        
        user.avatar = uploadResult.secure_url
      } catch (error) {
        console.error('Avatar upload error:', error)
        return res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json(
            generalResponse(
              StatusCodes.INTERNAL_SERVER_ERROR,
              {},
              [],
              'Avatar upload failed. Please try again.',
            ),
          )
      }
    }

    if (req.body.first_name) {
      if (!/^[A-Za-z\-']+$/.test(req.body.first_name)) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json(
            generalResponse(
              StatusCodes.BAD_REQUEST,
              {},
              [],
              'Please make sure first name does not contain spaces and has special characters; only dashes and apostrophes are allowed',
            ),
          )
      }

      if (
        user.first_name != req.body.first_name &&
        req.body.first_name === ''
      ) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json(
            generalResponse(
              StatusCodes.BAD_REQUEST,
              {},
              [],
              'First name cannot be empty',
            ),
          )
      }

      user.first_name = req.body.first_name
    }

    if (req.body.last_name) {
      if (!/^[A-Za-z\-']+$/.test(req.body.last_name)) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json(
            generalResponse(
              StatusCodes.BAD_REQUEST,
              {},
              [],
              'Please make sure last name does not contain spaces and has special characters; only dashes and apostrophes are allowed',
            ),
          )
      }

      if (user.last_name != req.body.last_name && req.body.last_name === '') {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json(
            generalResponse(
              StatusCodes.BAD_REQUEST,
              {},
              [],
              'Last name cannot be empty',
            ),
          )
      }

      user.last_name = req.body.last_name
    }
    // Check if the phone number is provided and not an empty string.
    if (req.body.phone !== undefined) {
      if (req.body.phone === '') {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json(
            generalResponse(
              StatusCodes.BAD_REQUEST,
              {},
              [],
              'Phone number cannot be empty',
            ),
          )
      }

      // Check if the phone number is different from the current user's.
      if (req.body.phone !== user.phone) {
        // Validate the new phone number against the regex.
        const phoneRegex = /^[0-9]{10}$/
        if (!req.body.phone.match(phoneRegex)) {
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

        // Check for conflicts with other accounts.
        const existingPhone = await userRepository.findOne({
          where: {
            phone: req.body.phone,
          },
        })
        if (existingPhone && existingPhone.id !== user.id) {
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

        // If all checks pass, update the user's phone.
        user.phone = req.body.phone
      }
    }

    if (req.body.address && req.body.address.length < 5) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            'Address must be at least 5 characters long',
          ),
        )
    }

    if (user.address != req.body.address && req.body.address === '') {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            'Address cannot be empty',
          ),
        )
    }

    user.address = req.body.address

    if (
      req.body.region &&
      !Object.values(RegionEnum).includes(req.body.region)
    ) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            `Invalid region, region list include: [${regionList}]`,
          ),
        )
    }

    if (user.region != req.body.region && req.body.region === '') {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            'Region cannot be empty',
          ),
        )
    }

    user.region = req.body.region

    if (req.body.city && !Object.values(CityEnum).includes(req.body.city)) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            `Invalid city, city list include: [${cityList}]`,
          ),
        )
    }

    if (user.city != req.body.city && req.body.city === '') {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            'City number cannot be empty',
          ),
        )
    }

    user.city = req.body.city

    user.updatedAt = new Date(Date.now())

    await userRepository.save(user)

    await notificationService.createNotification(
      user,
      'Profile Updated',
      'Your profile has been updated successfully.',
      NotificationType.PROFILE_UPDATE,
    )

    return res.status(StatusCodes.OK).json(
      generalResponse(
        StatusCodes.OK,
        {
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name,
          avatar: user.avatar,
          address: user.address,
          region: user.region,
          city: user.city,
          last_updated: user.updatedAt,
        },
        [],
        'Profile updated successfully.',
      ),
    )
  },
)

// export const editAddress = catchController(async (req: Request, res: Response) => {
//     // const payload: { username?: string, first_name?: string, last_name?: string, phone?: string } = {}
//     const { address, region, city } = req.body
//     const requiredFields = ['address', 'region', 'city']
//     const user = req.user
//     const userRepository = AppDataSource.getRepository(User)

//     if (requiredFields.some(field => !req.body[field])) {
//         return res.status(StatusCodes.BAD_REQUEST).json(generalResponse(StatusCodes.BAD_REQUEST, {}, [], 'Please make sure you pass all the required fields'))
//     }

//     if (address && address.length < 5) {
//         return res.status(StatusCodes.BAD_REQUEST).json(generalResponse(StatusCodes.BAD_REQUEST, {}, [], 'Address must be at least 5 characters long'))
//     }

//     if (region && !Object.values(RegionEnum).includes(region)) {
//         return res.status(StatusCodes.BAD_REQUEST).json(generalResponse(StatusCodes.BAD_REQUEST, {}, [], `Invalid region, region list include: [${regionList}]`))
//     }

//     if (city && !Object.values(CityEnum).includes(city)) {
//         return res.status(StatusCodes.BAD_REQUEST).json(generalResponse(StatusCodes.BAD_REQUEST, {}, [], `Invalid city, city list include: [${cityList}]`))
//     }

//     user.updatedAt = (new Date(Date.now()))
//     user.address = address
//     user.city = city
//     user.region = region

//     await userRepository.save(user)
//     return res.status(StatusCodes.OK).json(generalResponse(StatusCodes.OK, {
//         address: user.address,
//         city: user.city,
//         region: user.region,
//         last_updated: user.updatedAt,
//     }, [], "Pickup address updated successfully."));

// });

export const changePassword = catchController(
  async (req: Request, res: Response) => {
    const { oldPassword, newPassword, confirmPassword } = req.body

    const requiredFields = ['oldPassword', 'newPassword', 'confirmPassword']
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
    const user: User | undefined = req.user

    if (!user) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(generalResponse(StatusCodes.BAD_REQUEST, {}, [], userNotFound))
    }

    if (user?.googleId) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            "You can't change your password because you signed up with google",
          ),
        )
    }

    if (newPassword !== confirmPassword) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            'New password and confirm password do not match',
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

    if (user.password) {
      const isOldPasswordCorrect = await bcrypt.compare(
        oldPassword,
        user.password,
      )
      if (!isOldPasswordCorrect) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json(
            generalResponse(
              StatusCodes.BAD_REQUEST,
              {},
              [],
              'Old password is not correct',
            ),
          )
      }

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
    await AppDataSource.getRepository(User).save(user)

    await notificationService.createNotification(
      user,
      'Password Changed',
      'Your password has been changed successfully. If you did not do this, please contact support.',
      NotificationType.PASSWORD_CHANGE,
    )

    res
      .status(StatusCodes.OK)
      .json(
        generalResponse(
          StatusCodes.OK,
          {},
          [],
          'Password has been changed successfully',
        ),
      )
  },
)

export const lodgeComplaint = catchController(
  async (req: Request, res: Response) => {
    const { message } = req.body
    if (!message) {
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

    const complaint = new Contact()
    complaint.message = message
    complaint.user = req.user
    await AppDataSource.getRepository(Contact).save(complaint)
    res
      .status(StatusCodes.OK)
      .json(
        generalResponse(
          StatusCodes.OK,
          {},
          [],
          'Your complaint has been received, we will get back to you shortly',
        ),
      )
  },
)
