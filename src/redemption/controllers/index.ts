import {
  Transaction,
  TransactionType,
  TransactionDirection,
  TransactionStatus,
} from '../../entities/transactions'
import {
  generalResponse,
  insufficientPoints,
  returnSuccess,
  userNotFound,
} from '../../helpers/constants'
import {
  redeemForAirtimeSchema,
  redeemForCashSchema,
} from '../../utils/validators/redemption'
import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { Configurations } from '../../entities/configurations'
import { Redemption, RedemptionStatus, RedemptionType } from '../../entities/redemption'
import { User } from '../../entities/user'
import { Wallet } from '../../entities/wallet'
import catchController from '../../utils/catchControllerAsyncs'
import { formatJoiError } from '../../utils/helper'
import { AppDataSource } from '../../data-source'
import { notificationService } from '../../services/notification.service'
import { NotificationType } from '../../entities/notification'

const performRedemption = async (
  user: User,
  points: number,
  type: RedemptionType,
  specificData: Partial<Redemption>,
) => {
  return await AppDataSource.transaction(async (transactionalEntityManager) => {
    // 1. Fetch Point-to-Naira Config
    const config = await transactionalEntityManager.findOne(Configurations, {
      where: { type: 'point_to_naira' },
    })

    if (!config?.value) {
      const error: any = new Error('Point to naira rate not configured')
      error.statusCode = StatusCodes.BAD_REQUEST
      throw error
    }

    // 2. Fetch Wallet with Pessimistic Lock (Prevents race conditions/double spending)
    const wallet = await transactionalEntityManager.findOne(Wallet, {
      where: { user: { id: user.id } },
      lock: { mode: 'pessimistic_write' },
    })

    if (!wallet || (wallet.points ?? 0) < points) {
      return {
        error: true,
        status: StatusCodes.BAD_REQUEST,
        message: 'Insufficient points',
      }
    }

    // 3. Calculation Logic
    const conversionRate = Number(config.value)
    const nairaAmount =
      !isNaN(conversionRate) && conversionRate !== 0
        ? Math.round((points / conversionRate) * 100) / 100
        : 0

    // 4. Deduct Points from Wallet
    wallet.points = Number(wallet.points ?? 0) - points
    await transactionalEntityManager.save(wallet)

    // 5. Create Redemption Record
    const redemption = transactionalEntityManager.create(Redemption, {
      type,
      points,
      user,
      status: RedemptionStatus.PENDING,
      ...specificData,
    })
    const savedRedemption = await transactionalEntityManager.save(redemption)

    // 6. Create Transaction Log
    const transaction = transactionalEntityManager.create(Transaction, {
      type:
        type === RedemptionType.AIRTIME
          ? TransactionType.AIRTIME
          : TransactionType.CASH,
      direction: TransactionDirection.DEBIT,
      amount: nairaAmount,
      status: TransactionStatus.PENDING,
      description: `You requested to redeem ${points} of your points to ${type}.`,
      user,
      wallet,
      date: new Date()
    })
    await transactionalEntityManager.save(transaction)

    // Return the data needed by the controller
    return { error: false, data: { savedRedemption, nairaAmount } }
  })
}

export const redeemForAirtime = catchController(
  async (req: Request, res: Response) => {
    const user: User | undefined = req.user
    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(generalResponse(StatusCodes.NOT_FOUND, '', [], userNotFound))
    }
    const { error } = redeemForAirtimeSchema.validate(req.body)
    if (error) {
      const { details, message } = formatJoiError(error)
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(generalResponse(StatusCodes.BAD_REQUEST, {}, details, message))
    }

    const { network, points, phoneNumber } = req.body

    const result = await performRedemption(
      user,
      points,
      RedemptionType.AIRTIME,
      { network, phoneNumber },
    )

    if (result.error) {
      const statusCode = result.status ?? StatusCodes.INTERNAL_SERVER_ERROR
      return res
        .status(statusCode)
        .json(generalResponse(statusCode, '', [], result.message ?? 'An error occured'))
    }

    // Now savedRedemption and nairaAmount exist because we returned them from the helper
    const { savedRedemption, nairaAmount } = result.data!

    await notificationService.createNotification(
      user,
      'Redemption Requested',
      `Your request to redeem ${points} points for airtime has been received and is pending approval.`,
      NotificationType.TRANSACTION_SUCCESS,
    )

    return res.status(StatusCodes.CREATED).json(
      generalResponse(
        StatusCodes.CREATED,
        {
          ...savedRedemption,
          user: {
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
          },
        },
        [],
        `Success, you'll be credited with ₦${nairaAmount} airtime soon.`,
      ),
    )
  },
)


export const redeemForCash = catchController(
  async (req: Request, res: Response) => {
    const user = req.user as User
    const { error } = redeemForCashSchema.validate(req.body)
    if (error) {
      const { details, message } = formatJoiError(error)
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(generalResponse(StatusCodes.BAD_REQUEST, {}, details, message))
    }

    const { points, accountNumber, bankName, accountName } = req.body

    const result = await performRedemption(user, points, RedemptionType.CASH, {
      accountNumber,
      bankName,
      accountName,
    })

    if (result.error) {
      const statusCode = result.status ?? StatusCodes.INTERNAL_SERVER_ERROR
      return res
        .status(statusCode)
        .json(generalResponse(statusCode, '', [], result.message ?? 'An error occured'))
    }

    const { savedRedemption, nairaAmount } = result.data!

    await notificationService.createNotification(
      user,
      'Redemption Requested',
      `Your request to redeem ${points} points for cash has been received and is pending approval.`,
      NotificationType.TRANSACTION_SUCCESS,
    )

    return res.status(StatusCodes.CREATED).json(
      generalResponse(
        StatusCodes.CREATED,
        {
          ...savedRedemption,
          user: {
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
          },
        },
        [],
        `Success, you'll be credited with ₦${nairaAmount} cash soon.`,
      ),
    )
  },
)

