import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { User } from 'src/entities/user'

import { AppDataSource } from '../../data-source'
import { Contribution } from '../../entities/contribution'
import { Donation } from '../../entities/donation'
import {
  Transaction,
  TransactionType,
  TransactionDirection,
  TransactionStatus,
} from '../../entities/transactions'
import { Wallet } from '../../entities/wallet'
import {
  donationNotFound,
  generalResponse,
  insufficientPoints,
  returnSuccess,
  userNotFound,
} from '../../helpers/constants'
import catchController from '../../utils/catchControllerAsyncs'
import { createContributionSchema } from '../../utils/validators/donation'

export const createContribution = catchController(
  async (req: Request, res: Response) => {
    const user: User | undefined = req.user
    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(generalResponse(StatusCodes.NOT_FOUND, '', [], userNotFound))
    }

    const { error } = createContributionSchema.validate(req.body)
    if (error) {
      const details = error.details.map((d) => d.message)
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            details,
            details.join('; '),
          ),
        )
    }

    const { campaignId, amount } = req.body

    // Use a transaction to ensure atomicity
    const result = await AppDataSource.transaction(
      async (transactionalEntityManager) => {
        // 1. Fetch Campaign and check if it exists/active
        const campaign = await transactionalEntityManager.findOne(Donation, {
          where: { id: campaignId },
        })

        if (!campaign) {
          return {
            error: true,
            status: StatusCodes.NOT_FOUND,
            message: donationNotFound,
          }
        }

        // 2. Fetch Wallet with a pessimistic_write lock to prevent concurrent deduction issues
        const wallet = await transactionalEntityManager.findOne(Wallet, {
          where: { user: { id: user.id } },
          lock: { mode: 'pessimistic_write' },
        })

        if (!wallet || (wallet.points ?? 0) < amount) {
          return {
            error: true,
            status: StatusCodes.BAD_REQUEST,
            message: insufficientPoints,
          }
        }

        // 3. Perform Calculations
        wallet.points = (wallet.points ?? 0) - amount
        
        // 4. Save Updates
        await transactionalEntityManager.save(wallet)
        await transactionalEntityManager.save(campaign)

        // 5. Create Contribution Record
        const newContribution = new Contribution()
        newContribution.amount = amount
        newContribution.user = user
        newContribution.wallet = wallet
        newContribution.donation = campaign
        const savedContribution = await transactionalEntityManager.save(
          newContribution,
        )

        // 6. Create Transaction Record
        const transaction = new Transaction()
        transaction.type = TransactionType.DONATION
        transaction.direction = TransactionDirection.DEBIT
        transaction.amount = amount
        transaction.charges = 0
        transaction.date = new Date()
        transaction.status = TransactionStatus.FULFILLED
        transaction.description = `You donated ${amount.toFixed(
          2,
        )} of your points to ${campaign.title} campaign.`
        transaction.user = user
        transaction.wallet = wallet
        await transactionalEntityManager.save(transaction)

        return { error: false, data: savedContribution }
      },
    )

    // Handle Transaction Result
    if (result.error) {
      const statusCode = result.status ?? StatusCodes.INTERNAL_SERVER_ERROR

      return res
        .status(statusCode)
        .json(
          generalResponse(
            statusCode,
            '',
            [],
            result.message ?? 'An error occurred',
          ),
        )
    }

    const contribution = result.data
    res.status(StatusCodes.CREATED).json(
      generalResponse(
        StatusCodes.CREATED,
        {
          amount: contribution?.amount,
          donation: contribution?.donation,
          id: contribution?.id,
          createdAt: contribution?.createdAt,
          updatedAt: contribution?.updatedAt,
        },
        [],
        returnSuccess,
      ),
    )
  },
)

export const oldCreateContribution = catchController(
  async (req: Request, res: Response) => {
    const user: User | undefined = req.user
    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(generalResponse(StatusCodes.NOT_FOUND, '', [], userNotFound))
    }

    const { error } = createContributionSchema.validate(req.body)
    if (error) {
      const details = error.details.map((d) => d.message)
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(
            StatusCodes.BAD_REQUEST,
            {},
            details,
            details.join('; '),
          ),
        )
    }

    const { campaignId, amount } = req.body

    const donationRepository = AppDataSource.getRepository(Donation)
    const walletRepository = AppDataSource.getRepository(Wallet)
    const contributionRepository = AppDataSource.getRepository(Contribution)

    const campaign = await donationRepository.findOne({
      where: { id: campaignId },
    })
    if (!campaign) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(generalResponse(StatusCodes.NOT_FOUND, '', [], donationNotFound))
    }

    const wallet = await walletRepository.findOne({
      where: { user: { id: user.id } },
    })
    if (!wallet || (wallet.points ?? 0) < amount) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(StatusCodes.BAD_REQUEST, '', [], insufficientPoints),
        )
    }

    wallet.points = (wallet.points ?? 0) - amount
    await walletRepository.save(wallet)

    const newContribution = new Contribution()
    newContribution.amount = amount
    newContribution.user = user
    newContribution.wallet = wallet
    newContribution.donation = campaign
    await contributionRepository.save(newContribution)

    // Create transaction record
    const transactionRepository = AppDataSource.getRepository(Transaction)
    const transaction = new Transaction()
    transaction.type = TransactionType.DONATION
    transaction.direction = TransactionDirection.DEBIT
    transaction.amount = amount
    transaction.charges = 0
    transaction.date = new Date()
    transaction.status = TransactionStatus.FULFILLED
    transaction.description = `You donated ${amount.toFixed(2)} of your points to ${campaign.title} campaign.`
    transaction.user = user
    transaction.wallet = wallet
    await transactionRepository.save(transaction)

    res.status(StatusCodes.CREATED).json(
      generalResponse(
        StatusCodes.CREATED,
        {
          amount: newContribution.amount,
          donation: newContribution.donation,
          id: newContribution.id,
          createdAt: newContribution.createdAt,
          updatedAt: newContribution.updatedAt,
        },
        [],
        returnSuccess,
      ),
    )
  },
)
