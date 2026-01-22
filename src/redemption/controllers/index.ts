import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { AppDataSource } from '../../data-source'
import { Configurations } from '../../entities/configurations'
import { Redemption, RedemptionType } from '../../entities/redemption'
import {
  Transaction,
  TransactionType,
  TransactionDirection,
  TransactionStatus,
} from '../../entities/transactions'
import { User } from '../../entities/user'
import { Wallet } from '../../entities/wallet'
import {
  generalResponse,
  insufficientPoints,
  returnSuccess,
  userNotFound,
} from '../../helpers/constants'
import catchController from '../../utils/catchControllerAsyncs'
import { formatJoiError } from '../../utils/helper'
import {
  redeemForAirtimeSchema,
  redeemForCashSchema,
} from '../../utils/validators/redemption'

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

    const walletRepository = AppDataSource.getRepository(Wallet)
    const redemptionRepository = AppDataSource.getRepository(Redemption)
    const configurationRepository = AppDataSource.getRepository(Configurations)

    const pointToNaira = await configurationRepository.findOne({
      where: { type: 'point_to_naira' },
    })

    if (!pointToNaira?.value) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            '',
            [],
            'Point to naira not set',
          ),
        )
    }

    const wallet = await walletRepository.findOne({
      where: { user: { id: user.id } },
    })
    if (!wallet || (wallet.points || 0) < points) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(StatusCodes.BAD_REQUEST, '', [], insufficientPoints),
        )
    }

    const nairapoints = points * Number(pointToNaira?.value)

    const newRedemption = new Redemption()
    newRedemption.type = RedemptionType.AIRTIME
    newRedemption.points = points
    newRedemption.network = network
    newRedemption.phoneNumber = phoneNumber
    newRedemption.user = user
    await redemptionRepository.save(newRedemption)

    wallet.points = (wallet.points || 0) - points
    await walletRepository.save(wallet)

    // Create transaction record
    const transactionRepository = AppDataSource.getRepository(Transaction)
    const transaction = new Transaction()
    transaction.type = TransactionType.AIRTIME
    transaction.direction = TransactionDirection.DEBIT
    transaction.amount = nairapoints
    transaction.charges = 0
    transaction.date = new Date()
    transaction.status = TransactionStatus.PENDING
    transaction.description = `You requested to convert ${points.toFixed(
      2,
    )} points to airtime.`
    transaction.user = user
    transaction.wallet = wallet
    await transactionRepository.save(transaction)

    const { accountNumber, bankName, accountName, ...airtimeData } =
      newRedemption
    res.status(StatusCodes.CREATED).json(
      generalResponse(
        StatusCodes.CREATED,
        {
          ...airtimeData,
          user: {
            id: user.id,
            username: user.username,
            firstName: user.first_name,
            lastName: user.last_name,
          },
        },
        [],
        `${returnSuccess}, you'll be credited with ${nairapoints} airtime soon.`,
      ),
    )
  },
)

export const redeemForCash = catchController(
  async (req: Request, res: Response) => {
    const user: User | undefined = req.user
    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(generalResponse(StatusCodes.NOT_FOUND, '', [], userNotFound))
    }

    const { error } = redeemForCashSchema.validate(req.body)
    if (error) {
      const { details, message } = formatJoiError(error)
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(generalResponse(StatusCodes.BAD_REQUEST, {}, details, message))
    }

    const { points, accountNumber, bankName, accountName } = req.body

    const walletRepository = AppDataSource.getRepository(Wallet)
    const redemptionRepository = AppDataSource.getRepository(Redemption)
    const configurationRepository = AppDataSource.getRepository(Configurations)

    const pointToNaira = await configurationRepository.findOne({
      where: { type: 'point_to_naira' },
    })

    if (!pointToNaira?.value) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            '',
            [],
            'Point to naira not set',
          ),
        )
    }

    const wallet = await walletRepository.findOne({
      where: { user: { id: user.id } },
    })
    if (!wallet || (wallet.points || 0) < points) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(StatusCodes.BAD_REQUEST, '', [], insufficientPoints),
        )
    }

    const nairapoints = points * Number(pointToNaira?.value)

    const newRedemption = new Redemption()
    newRedemption.type = RedemptionType.CASH
    newRedemption.points = points
    newRedemption.accountNumber = accountNumber
    newRedemption.bankName = bankName
    newRedemption.accountName = accountName
    newRedemption.user = user
    await redemptionRepository.save(newRedemption)

    wallet.points = (wallet.points || 0) - points
    await walletRepository.save(wallet)

    // Create transaction record
    const transactionRepository = AppDataSource.getRepository(Transaction)
    const transaction = new Transaction()
    transaction.type = TransactionType.CASH
    transaction.direction = TransactionDirection.DEBIT
    transaction.amount = nairapoints
    transaction.charges = 0
    transaction.date = new Date()
    transaction.status = TransactionStatus.PENDING
    transaction.description = `You requested to convert ${points.toFixed(
      2,
    )} points to cash.`
    transaction.user = user
    transaction.wallet = wallet
    await transactionRepository.save(transaction)

    const { network, phoneNumber, ...cashData } = newRedemption
    res.status(StatusCodes.CREATED).json(
      generalResponse(
        StatusCodes.CREATED,
        {
          ...cashData,
          user: {
            id: user.id,
            username: user.username,
            firstName: user.first_name,
            lastName: user.last_name,
          },
        },
        [],
        `${returnSuccess}, you'll be credited with #${nairapoints} soon.`,
      ),
    )
  },
)
