import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { User } from 'src/entities/user'

import { AppDataSource } from '../../data-source'
import { Configurations } from '../../entities/configurations'
import { Wallet } from '../../entities/wallet'
import {
  generalResponse,
  returnSuccess,
  userNotFound,
} from '../../helpers/constants'
import catchController from '../../utils/catchControllerAsyncs'

export const getWallet = catchController(
  async (req: Request, res: Response) => {
    const user: User | undefined = req.user

    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(generalResponse(StatusCodes.NOT_FOUND, '', [], userNotFound))
    }

    const walletRepository = AppDataSource.getRepository(Wallet)
    const configurationRepository = AppDataSource.getRepository(Configurations)

    const wallet = await walletRepository.findOne({
      relations: {
        user: true,
      },
      where: {
        user: {
          id: user.id,
        },
      },
    })

    const pointToNaira = await configurationRepository.findOne({
      where: { type: 'point_to_naira' },
    })

    const points = wallet?.points ?? 0
    const rate = parseFloat(pointToNaira?.value ?? '1')
    const nairaAmount = points / rate

    res.status(StatusCodes.OK).json(
      generalResponse(
        StatusCodes.OK,
        {
          id: wallet?.id,
          naira_amount: nairaAmount,
          points: wallet?.points,
          last_transaction_time: wallet?.updatedAt,
          point_to_naira: pointToNaira?.value,
        },
        [],
        returnSuccess,
      ),
    )
  },
)
