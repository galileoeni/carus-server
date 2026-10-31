import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import jwt from 'jsonwebtoken'

import { generalResponse } from './constants'
import { UserRoleEnum } from '../@types/user'
import { AppDataSource } from '../data-source'
import { User } from '../entities/user'

const userRepository = AppDataSource.getRepository(User)

const reject = (res: Response, status: number, message: string) =>
  res.status(status).json(generalResponse(status, {}, [], message))

// Like verifyToken, but only lets active business accounts through
async function verifyBusiness(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return reject(
      res,
      StatusCodes.BAD_REQUEST,
      'Invalid token or token is missing',
    )
  }

  let decoded: { id: string; type?: string }
  try {
    decoded = jwt.verify(
      header.split(' ')[1],
      process.env.JWT_SECRET as string,
    ) as { id: string; type?: string }
  } catch {
    return reject(
      res,
      StatusCodes.UNAUTHORIZED,
      'Token has expired, please log in again',
    )
  }
  if (decoded.type && decoded.type !== 'access') {
    return reject(
      res,
      StatusCodes.FORBIDDEN,
      'Provided token is not an access token',
    )
  }

  const user = await userRepository.findOne({ where: { id: decoded.id } })
  if (!user || user.role !== UserRoleEnum.BUSINESS) {
    return reject(res, StatusCodes.FORBIDDEN, 'Business account required')
  }
  if (user.isDisabled || user.status !== 'ACTIVE') {
    return reject(
      res,
      StatusCodes.UNAUTHORIZED,
      'Account is not active, contact support',
    )
  }

  req.user = user
  return next()
}

export default verifyBusiness
