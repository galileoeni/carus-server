import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { Brackets, IsNull } from 'typeorm'

import { AppDataSource } from '../../data-source'
import { Notification } from '../../entities/notification'
import { NotificationRead } from '../../entities/notification-read'
import { User } from '../../entities/user'
import {
  generalResponse,
  Pagination,
  returnSuccess,
} from '../../helpers/constants'
import catchController from '../../utils/catchControllerAsyncs'

const notificationRepository = AppDataSource.getRepository(Notification)
const notificationReadRepository = AppDataSource.getRepository(NotificationRead)
const userRepository = AppDataSource.getRepository(User)

export const getNotifications = catchController(
  async (req: Request, res: Response) => {
    const user = req.user as User
    const page = parseInt(req.query.page as string, 10) || 1
    const pageSize = parseInt(req.query.pageSize as string, 10) || 10

    const queryBuilder = notificationRepository
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.user', 'user')
      .leftJoinAndSelect(
        'notification.reads',
        'read',
        'read.userId = :userId AND read.userEmail = :userEmail',
        { userId: user.id, userEmail: user.email },
      )
      .where('user.id = :userId OR notification.userId IS NULL', {
        userId: user.id,
      })
      .orderBy('notification.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [notifications, totalCount] = await queryBuilder.getManyAndCount()

    const unreadCount = await notificationRepository
      .createQueryBuilder('notification')
      .leftJoin('notification.user', 'user')
      .leftJoin(
        'notification.reads',
        'read',
        'read.userId = :userId AND read.userEmail = :userEmail',
        { userId: user.id, userEmail: user.email },
      )
      .where(
        new Brackets((qb) => {
          qb.where('user.id = :userId AND notification.isRead = false', {
            userId: user.id,
          }).orWhere('user.id IS NULL AND read.id IS NULL')
        }),
      )
      .getCount()

    const mappedNotifications = notifications.map((n) => {
      const isRead = n.user ? n.isRead : !!(n.reads && n.reads.length > 0)
      const { reads: _reads, ...notificationData } = n
      return { ...notificationData, isRead }
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
          notifications: mappedNotifications,
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
      where: [{ id, user: { id: user.id } }, { id, user: IsNull() }],
      relations: ['user'],
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

    if (notification.user) {
      notification.isRead = true
      await notificationRepository.save(notification)
    } else {
      const existingRead = await notificationReadRepository.findOne({
        where: {
          notification: { id: notification.id },
          user: { id: user.id, email: user.email },
        },
      })
      if (!existingRead) {
        const newRead = new NotificationRead()
        newRead.notification = notification
        newRead.user = user
        await notificationReadRepository.save(newRead)
      }
    }

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
