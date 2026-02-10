import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { notificationService } from '../../services/notification.service'
import { generalResponse } from '../../helpers/constants'
import catchController from '../../utils/catchControllerAsyncs'

export const sendPushNotification = catchController(
  async (req: Request, res: Response) => {
    const { title, message } = req.body

    if (!title || !message) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            'Title and message are required',
          ),
        )
    }

    await notificationService.sendBroadcastNotification(title, message)

    return res
      .status(StatusCodes.OK)
      .json(
        generalResponse(
          StatusCodes.OK,
          {},
          [],
          'Broadcast notification sent successfully',
        ),
      )
  },
)
