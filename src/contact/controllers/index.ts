import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { User } from 'src/entities/user'

import { generalResponse, userNotFound } from '../../helpers/constants'
import { sendContactMessage } from '../../helpers/emailService'
import catchController from '../../utils/catchControllerAsyncs'

export const contactEmailController = catchController(
  async (req: Request, res: Response) => {
    const { message }: { message: string } = req.body

    // console.log(message)

    if (!message) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            'Message field cannot be empty',
          ),
        )
    }

    const user: User | undefined = req.user

    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(generalResponse(StatusCodes.NOT_FOUND, '', [], userNotFound))
    }

    // console.log(user.email, user.first_name)

    if (!user.email || !user.first_name || !user.last_name) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(generalResponse(StatusCodes.NOT_FOUND, {}, [], userNotFound))
    }

    await sendContactMessage(
      user.email,
      user.first_name,
      user.last_name,
      message,
    )

    return res
      .status(StatusCodes.OK)
      .json(
        generalResponse(StatusCodes.OK, {}, [], 'Message sent successfully'),
      )
  },
)
