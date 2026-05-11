import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { geminiService } from '../../services/gemini.service'
import { generalResponse } from '../../helpers/constants'
import catchController from '../../utils/catchControllerAsyncs'

export const sendMessage = catchController(
  async (req: Request, res: Response) => {
    const { message, sessionId } = req.body

    if (!message) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            'Message is required',
          ),
        )
    }

    const result = await geminiService.sendMessage(
      message,
      sessionId || 'default'
    )

    if (result.error) {
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json(
          generalResponse(
            StatusCodes.INTERNAL_SERVER_ERROR,
            {},
            [],
            result.error,
          ),
        )
    }

    return res
      .status(StatusCodes.OK)
      .json(
        generalResponse(
          StatusCodes.OK,
          { response: result.response },
          [],
          'Message sent successfully',
        ),
      )
  },
)

export const sendFeedback = catchController(
  async (req: Request, res: Response) => {
    const { sessionId, message, feedback } = req.body

    if (!sessionId || !message || !feedback) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            'Session ID, message, and feedback are required',
          ),
        )
    }

    const result = await geminiService.sendFeedback(
      sessionId,
      message,
      feedback
    )

    return res
      .status(StatusCodes.OK)
      .json(
        generalResponse(
          StatusCodes.OK,
          {},
          [],
          result.message,
        ),
      )
  },
)

export const clearChatHistory = catchController(
  async (req: Request, res: Response) => {
    const { sessionId } = req.params

    if (!sessionId) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            [],
            'Session ID is required',
          ),
        )
    }

    geminiService.clearChatHistory(sessionId as string)

    return res
      .status(StatusCodes.OK)
      .json(
        generalResponse(
          StatusCodes.OK,
          {},
          [],
          'Chat history cleared successfully',
        ),
      )
  },
)