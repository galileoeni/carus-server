import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { AppDataSource } from '../../data-source'
import { Notification } from '../../entities/notification'
import { User } from '../../entities/user'
import { generalResponse, returnSuccess, Pagination } from '../../helpers/constants'
import catchController from '../../utils/catchControllerAsyncs'

const notificationRepository = AppDataSource.getRepository(Notification)
const userRepository = AppDataSource.getRepository(User)

export const getNotifications = catchController(
  async (req: Request, res: Response) => {
    const user = req.user as User
    const page = parseInt(req.query.page as string, 10) || 1
    const pageSize = parseInt(req.query.pageSize as string, 10) || 10

    const [notifications, totalCount] = await notificationRepository.findAndCount({
      where: { user: { id: user.id } },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    const unreadCount = await notificationRepository.count({
      where: { user: { id: user.id }, isRead: false },
    })

    const pagination: Pagination = {
      currentPage: Number(page),
      totalPages: Math.ceil(totalCount / Number(pageSize)),
      pageSize: Number(pageSize),
      totalCount,
    }

    return res.status(StatusCodes.OK).json(
      generalResponse(
        StatusCodes.OK,
        {
          notifications,
          unreadCount,
        },
        [],
        returnSuccess,
        pagination,
      ),
    )
  },
)

export const markAsRead = catchController(
  async (req: Request, res: Response) => {
    const id = req.params.id as string
    const user = req.user as User

    const notification = await notificationRepository.findOne({
      where: { id, user: { id: user.id } },
    })

    if (!notification) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(
          generalResponse(
            StatusCodes.NOT_FOUND,
            {},
            [],
            'Notification not found',
          ),
        )
    }

    notification.isRead = true
    await notificationRepository.save(notification)

    return res
      .status(StatusCodes.OK)
      .json(
        generalResponse(
          StatusCodes.OK,
          {},
          [],
          'Notification marked as read',
        ),
      )
  },
)

export const updateFcmToken = catchController(
  async (req: Request, res: Response) => {
    const { token } = req.body
    const user = req.user as User

    if (!token) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            'Token is required',
          ),
        )
    }

    user.fcmToken = token
    await userRepository.save(user)

    return res
      .status(StatusCodes.OK)
      .json(
        generalResponse(
          StatusCodes.OK,
          {},
          [],
          'FCM token updated successfully',
        ),
      )
  },
)
