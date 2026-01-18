import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { AppDataSource } from '../../data-source'
import { Contact } from '../../entities/contact'
import { User } from '../../entities/user'
import {
  generalResponse,
  Pagination,
  userNotFound,
} from '../../helpers/constants'
import catchController from '../../utils/catchControllerAsyncs'

export const toggleUserStatus = catchController(
  async (req: Request, res: Response) => {
    const { id } = req.params

    const userRepository = AppDataSource.getRepository(User)
    const user = await userRepository.findOne({ where: { id: id.toString() } })

    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(generalResponse(StatusCodes.NOT_FOUND, {}, [], userNotFound))
    }

    user.isDisabled = !user.isDisabled
    const updatedUser = await userRepository.save(user)

    return res
      .status(StatusCodes.OK)
      .json(
        generalResponse(
          StatusCodes.OK,
          updatedUser,
          [],
          `User has been ${updatedUser.isDisabled ? 'disabled' : 'enabled'}`,
        ),
      )
  },
)

export const viewComplaints = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string, 10) || 1
  const pageSize = parseInt(req.query.pageSize as string, 10) || 10
  const contactRepository = AppDataSource.getRepository(Contact)
  const [complaints, totalCount] = await contactRepository.findAndCount({
    relations: ['user'],
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  const pagination: Pagination = {
    currentPage: Number(page),
    totalPages: Math.ceil(totalCount / Number(pageSize)),
    pageSize: Number(pageSize),
    totalCount,
  }
  return res
    .status(StatusCodes.OK)
    .json(
      generalResponse(
        StatusCodes.OK,
        complaints,
        [],
        'Complaints fetched successfully',
        pagination,
      ),
    )
}
