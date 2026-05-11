import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { notificationService } from '../../services/notification.service'
import { generalResponse } from '../../helpers/constants'
import catchController from '../../utils/catchControllerAsyncs'

export const sendNotificationToUser = catchController(
  async (req: Request, res: Response) => {
    const { userId, title, message, type } = req.body

    if (!userId || !title || !message) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            'User ID, title, and message are required',
          ),
        )
    }

    const notification = await notificationService.sendNotificationToUser(
      userId,
      title,
      message,
      type || 'ANNOUNCEMENT'
    )

    return res
      .status(StatusCodes.OK)
      .json(
        generalResponse(
          StatusCodes.OK,
          { notification },
          [],
          'Notification sent successfully',
        ),
      )
  },
)

export const sendPickupNotification = catchController(
  async (req: Request, res: Response) => {
    const { userId, scheduleDetails } = req.body

    if (!userId || !scheduleDetails) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            'User ID and schedule details are required',
          ),
        )
    }

    const notification = await notificationService.sendPickupNotification(
      userId,
      scheduleDetails
    )

    return res
      .status(StatusCodes.OK)
      .json(
        generalResponse(
          StatusCodes.OK,
          { notification },
          [],
          'Pickup notification sent successfully',
        ),
      )
  },
)

export const sendScheduleUpdateNotification = catchController(
  async (req: Request, res: Response) => {
    const { userId, scheduleDetails } = req.body

    if (!userId || !scheduleDetails) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            'User ID and schedule details are required',
          ),
        )
    }

    const notification = await notificationService.sendScheduleUpdateNotification(
      userId,
      scheduleDetails
    )

    return res
      .status(StatusCodes.OK)
      .json(
        generalResponse(
          StatusCodes.OK,
          { notification },
          [],
          'Schedule update notification sent successfully',
        ),
      )
  },
)