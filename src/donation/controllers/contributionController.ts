import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { User } from 'src/entities/user'

import { AppDataSource } from '../../data-source'
import { Contribution } from '../../entities/contribution'
import { Donation } from '../../entities/donation'
import { Transaction } from '../../entities/transactions'
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
    if (!wallet || (wallet.points || 0) < amount) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          generalResponse(StatusCodes.BAD_REQUEST, '', [], insufficientPoints),
        )
    }

    wallet.points = (wallet.points || 0) - amount
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
    transaction.type = 'donation'
    transaction.amount = amount
    transaction.charges = 0
    transaction.date = new Date()
    transaction.status = 'fulfilled'
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
