import {
  CategoryEnum,
  MaterialEnum,
  ScheduleRow,
  ScheduleStatusEnum,
} from '../../@types/schedule'
import {
  generalResponse,
  returnSuccess,
  userNotFound,
} from '../../helpers/constants'
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from '../../utils/cloudinary'
import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { Schedule } from '../../entities/schedule'
import { User } from '../../entities/user'
import { Wallet } from '../../entities/wallet'
import catchController from '../../utils/catchControllerAsyncs'
import { AppDataSource } from '../../data-source'
import { notificationService } from '../../services/notification.service'
import { NotificationType } from '../../entities/notification'
import { sendScheduleBookedEmail } from '../../helpers/emailService'

const passRequredFieldsMessage =
  'Please make sure you pass all the required fields'
const scheduleRepository = AppDataSource.getRepository(Schedule)
const walletRepository = AppDataSource.getRepository(Wallet)
const statusList = Object.values(ScheduleStatusEnum).join(', ')

// eslint-disable-next-line sonarjs/cognitive-complexity
const schedulePickup = catchController(async (req: Request, res: Response) => {
  const {
    material,
    material_amount,
    container_amount,
    address,
    status = 'pending',
    category,
  } = req.body as ScheduleRow

  //Check if all fields are passed
  const requiredFields = [
    'material',
    'material_amount',
    'container_amount',
    'date',
    'address',
  ]
  if (requiredFields.some((field) => !req.body[field])) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json(
        generalResponse(
          StatusCodes.BAD_REQUEST,
          {},
          [],
          passRequredFieldsMessage,
        ),
      )
  }

  //validate the material
  if (material && !Object.values(MaterialEnum).includes(material)) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json(
        generalResponse(
          StatusCodes.BAD_REQUEST,
          {},
          [],
          `Invalid material. The accepted materials are: [${Object.values(
            MaterialEnum,
          ).join(', ')}]`,
        ),
      )
  }

  //validate the category
  if (category && !Object.values(CategoryEnum).includes(category)) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json(
        generalResponse(
          StatusCodes.BAD_REQUEST,
          {},
          [],
          `Invalid category. The accepted categories are: [${Object.values(
            CategoryEnum,
          ).join(', ')}]`,
        ),
      )
  }

  //validate material amount
  if (material_amount < 50 || material_amount > 10000) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json(
        generalResponse(
          StatusCodes.BAD_REQUEST,
          {},
          [],
          'Material must be between 50 and 10,000',
        ),
      )
  }

  //validate container amount
  if (container_amount < 1 || container_amount > 50) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json(
        generalResponse(
          StatusCodes.BAD_REQUEST,
          {},
          [],
          'Container must be between 1 and 50',
        ),
      )
  }

  const user: User | undefined = req.user

  if (!user) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json(generalResponse(StatusCodes.NOT_FOUND, '', [], userNotFound))
  }

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

  if (!address) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json(
        generalResponse(
          StatusCodes.BAD_REQUEST,
          {},
          [],
          'Input a valid address',
        ),
      )
  }

  // const lga = user.city

  //validate date orrrrr... vali-DATE :)))
  const dateString = new Date(req.body.date)
  if (dateString < new Date(Date.now())) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json(
        generalResponse(
          StatusCodes.BAD_REQUEST,
          {},
          [],
          'The indicated date has elapsed',
        ),
      )
  }

  const date = dateString

  if (!wallet) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json(generalResponse(StatusCodes.NOT_FOUND, {}, [], 'Wallet not found'))
  }

  let image: string | undefined = undefined
  let publicId: string | undefined = undefined

  if (req.file) {
    try {
      const fileStr = `data:${
        req.file.mimetype
      };base64,${req.file.buffer.toString('base64')}`
      const uploadResult = await uploadToCloudinary(fileStr, 'wastes')
      image = uploadResult?.secure_url
      publicId = uploadResult?.public_id

      if (!image) {
        return res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json(
            generalResponse(
              StatusCodes.INTERNAL_SERVER_ERROR,
              {},
              [],
              'Failed to upload image to cloud storage',
            ),
          )
      }
    } catch (error) {
      console.error('Image upload error:', error)
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json(
          generalResponse(
            StatusCodes.INTERNAL_SERVER_ERROR,
            {},
            [],
            'Image upload failed. Please try again.',
          ),
        )
    }
  }

  const newSchedule = scheduleRepository.create({
    address: address,
    category: category,
    date: date,
    container_amount: container_amount,
    material: material,
    material_amount: material_amount,
    status: status,
    user: user,
    schedule_date: new Date(Date.now()),
    image: image,
  })

  await scheduleRepository.save(newSchedule)

  // Send in-app notification and booking confirmation email (both non-blocking)
  const categoryLabel = category === CategoryEnum.DROPOFF ? 'dropoff' : 'pickup'
  notificationService.createNotification(
    user,
    'Schedule Booked',
    `Your ${categoryLabel} for ${material} has been booked for ${date.toDateString()}. We will notify you once it is accepted.`,
    NotificationType.SCHEDULE,
  ).catch(() => {/* non-blocking */})

  if (user.email && user.first_name) {
    sendScheduleBookedEmail(
      user.first_name,
      user.email,
      categoryLabel,
      material,
      date.toDateString(),
    ).catch(() => {/* non-blocking */})
  }

  return res
    .status(StatusCodes.OK)
    .json(
      generalResponse(
        StatusCodes.OK,
        {},
        [],
        `Pickup scheduled, see you on ${date.toDateString()}`,
      ),
    )
})

const updatePickupSchedule = catchController(
  async (req: Request, res: Response) => {
    const user: User | undefined = req.user

    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(generalResponse(StatusCodes.NOT_FOUND, '', [], userNotFound))
    }

    const { status: newScheduleStatus } = req.body as ScheduleRow
    const scheduleId = String(req.params.id)

    if (!scheduleId) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            'Schedule id not specified',
          ),
        )
    }

    if (!newScheduleStatus) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            'New schedule status not specified',
          ),
        )
    }

    if (
      newScheduleStatus &&
      !Object.values(ScheduleStatusEnum).includes(newScheduleStatus)
    ) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            `Invalid schedule status, valid statuses are: ${statusList}`,
          ),
        )
    }

    const schedules = await scheduleRepository.find({
      relations: {
        user: true,
        transaction: true,
      },
      where: {
        user: {
          id: user.id,
        },
      },
    })

    const schedule = schedules.find(
      (matchedSchedule) => matchedSchedule.id === scheduleId,
    )

    if (!schedule) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(
          generalResponse(
            StatusCodes.NOT_FOUND,
            {},
            [],
            `Schedule with the id ${scheduleId} does not exist'`,
          ),
        )
    }

    let image: string | undefined = undefined
    let publicId: string | undefined = undefined

    if (req.file) {
      if (schedule.image) {
        const publicId = schedule.image.split('/').pop()?.split('.')[0]
        if (publicId) {
          await deleteFromCloudinary(`wastes/${publicId}`)
        }
      }
      try {
        const fileStr = `data:${
          req.file.mimetype
        };base64,${req.file.buffer.toString('base64')}`
        const uploadResult = await uploadToCloudinary(fileStr, 'wastes')
        image = uploadResult?.secure_url
        publicId = uploadResult?.public_id

        if (!image) {
          return res
            .status(StatusCodes.INTERNAL_SERVER_ERROR)
            .json(
              generalResponse(
                StatusCodes.INTERNAL_SERVER_ERROR,
                {},
                [],
                'Failed to upload image to cloud storage',
              ),
            )
        }
      } catch (error) {
        console.error('Image upload error:', error)
        return res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json(
            generalResponse(
              StatusCodes.INTERNAL_SERVER_ERROR,
              {},
              [],
              'Image upload failed. Please try again.',
            ),
          )
      }
    }

    schedule.status = newScheduleStatus
    schedule.date = new Date(Date.now())
    schedule.image = image

    await scheduleRepository.save(schedule)
    return res.status(StatusCodes.OK).json(
      generalResponse(
        StatusCodes.OK,
        {
          id: schedule.id,
          address: schedule.address,
          amount: schedule.amount,
          category: schedule.category,
          container_amount: schedule.container_amount,
          date: schedule.date,
          material: schedule.material,
          material_amount: schedule.material_amount,
          schedule_date: schedule.schedule_date,
          status: schedule.status,
          transaction_id: schedule.transaction?.id,
          image: schedule.image,
        },
        [],
        returnSuccess,
      ),
    )
  },
)

const getSchedules = catchController(async (req: Request, res: Response) => {
  const user: User | undefined = req.user

  if (!user) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json(generalResponse(StatusCodes.NOT_FOUND, '', [], userNotFound))
  }

  const schedules = await scheduleRepository.find({
    relations: {
      user: true,
      transaction: true,
    },
    where: {
      user: {
        id: user.id,
      },
    },
  })
  res.status(StatusCodes.OK).json(
    generalResponse(
      StatusCodes.OK,
      schedules.map((schedule) => ({
        id: schedule.id,
        address: schedule.address,
        amount: schedule.amount,
        category: schedule.category,
        container_amount: schedule.container_amount,
        date: schedule.date,
        material: schedule.material,
        material_amount: schedule.material_amount,
        schedule_date: schedule.schedule_date,
        status: schedule.status,
        transaction_id: schedule.transaction?.id,
        image: schedule.image,
      })),
      [],
      returnSuccess,
    ),
  )
})

const getScheduleById = catchController(async (req: Request, res: Response) => {
  const user: User | undefined = req.user

  if (!user) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json(generalResponse(StatusCodes.NOT_FOUND, '', [], userNotFound))
  }

  const scheduleId = String(req.params.id)

  const schedules = await scheduleRepository.find({
    relations: {
      transaction: true,
    },
    where: {
      user: {
        id: user.id,
      },
    },
  })

  const schedule = schedules.find(
    (matchedSchedule) => matchedSchedule.id === scheduleId,
  )

  if (!schedule) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json(
        generalResponse(
          StatusCodes.NOT_FOUND,
          {},
          [],
          'Schedule with this id does not exist',
        ),
      )
  }

  res.status(StatusCodes.OK).json(
    generalResponse(
      StatusCodes.OK,
      {
        id: schedule.id,
        address: schedule.address,
        amount: schedule.amount,
        category: schedule.category,
        container_amount: schedule.container_amount,
        date: schedule.date,
        material: schedule.material,
        material_amount: schedule.material_amount,
        schedule_date: schedule.schedule_date,
        status: schedule.status,
        transaction_id: schedule.transaction?.id,
        image: schedule.image,
      },
      [],
      returnSuccess,
    ),
  )
})

const deleteScheduleById = catchController(
  async (req: Request, res: Response) => {
    const user: User | undefined = req.user

    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(generalResponse(StatusCodes.NOT_FOUND, '', [], userNotFound))
    }

    const scheduleId = String(req.params.id)

    const schedule = await scheduleRepository.findOne({
      where: {
        id: scheduleId,
        user: { id: user.id },
      },
    })

    if (!schedule) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(
          generalResponse(
            StatusCodes.NOT_FOUND,
            {},
            [],
            'Schedule with this id does not exist',
          ),
        )
    }

    if (schedule.image) {
      const publicId = schedule.image.split('/').pop()?.split('.')[0]
      await deleteFromCloudinary(`wastes/${publicId}`)
    }
    await scheduleRepository.remove(schedule)

    return res
      .status(StatusCodes.OK)
      .json(
        generalResponse(
          StatusCodes.OK,
          {},
          [],
          'Schedule deleted successfully',
        ),
      )
  },
)

export {
  deleteScheduleById,
  getScheduleById,
  getSchedules,
  schedulePickup,
  updatePickupSchedule,
}
