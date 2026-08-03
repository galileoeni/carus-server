import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { AppDataSource } from '../../data-source'
import { Contact, ComplaintStatus } from '../../entities/contact'
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
  const status = req.query.status as string | undefined

  const contactRepository = AppDataSource.getRepository(Contact)

  const where: Record<string, any> = {}
  if (status) where.status = status

  const [complaints, totalCount] = await contactRepository.findAndCount({
    relations: ['user'],
    where,
    order: { createdAt: 'DESC' },
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

export const resolveComplaint = catchController(
  async (req: Request, res: Response) => {
    const id = req.params.id as string
    const contactRepository = AppDataSource.getRepository(Contact)

    const complaint = await contactRepository.findOne({ where: { id } })

    if (!complaint) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(generalResponse(StatusCodes.NOT_FOUND, {}, [], 'Complaint not found'))
    }

    complaint.status = ComplaintStatus.RESOLVED
    await contactRepository.save(complaint)

    return res
      .status(StatusCodes.OK)
      .json(generalResponse(StatusCodes.OK, complaint, [], 'Complaint resolved successfully'))
  },
)
