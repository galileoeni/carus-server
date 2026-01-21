import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { User } from '../../entities/user'

import { AppDataSource } from '../../data-source'
import { Redemption } from '../../entities/redemption'
import { Transaction } from '../../entities/transactions'
import {
  generalResponse,
  returnSuccess,
  userNotFound,
} from '../../helpers/constants'
import catchController from '../../utils/catchControllerAsyncs'

export const getTransactions = catchController(
  async (req: Request, res: Response) => {
    const user: User | undefined = req.user

    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(generalResponse(StatusCodes.NOT_FOUND, '', [], userNotFound))
    }

    const transactionRepository = AppDataSource.getRepository(Transaction)
    const redemptionRepository = AppDataSource.getRepository(Redemption)

    const transactions = await transactionRepository.find({
      relations: {
        user: true,
      },
      where: {
        user: {
          id: user.id,
        },
      },
    })

    const redemptions = await redemptionRepository.find({
      relations: {
        user: true,
      },
      where: {
        user: {
          id: user.id,
        },
      },
    })

    const combined = [...transactions, ...redemptions].sort(
      (a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0),
    )

    res.status(StatusCodes.OK).json(
      generalResponse(
        StatusCodes.OK,
        combined.map((item) => {
          if (item instanceof Transaction) {
            return {
              transaction_id: item.id,
              amount: item.amount,
              charges: item.charges,
              date: item.date,
              type: item.type,
              status: item.status,
              description: item.description,
            }
          } else {
            return {
              transaction_id: item.id,
              amount: item.points,
              charges: 0,
              date: item.createdAt,
              type: item.type,
              status: item.status,
              description: item.description,
            }
          }
        }),
        [],
        returnSuccess,
      ),
    )
  },
)
