import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import jwt from 'jsonwebtoken'

import { UserRoleEnum } from '../@types/user'
import { User } from '../entities/user'
import { AppDataSource } from '../data-source'
import { generalResponse, userNotFound } from './constants'

const userRepository = AppDataSource.getRepository(User)

const allowedRoles = Object.values(UserRoleEnum)
async function verifyToken(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      const token = req.headers.authorization.split(' ')[1]

      const decoded = <{ type?: string; id: string }>(
        jwt.verify(token, process.env.JWT_SECRET as string)
      )

      if (decoded.type && decoded.type !== 'access') {
        return res
          .status(StatusCodes.FORBIDDEN)
          .json(
            generalResponse(
              StatusCodes.FORBIDDEN,
              {},
              [],
              'Provided token is not an access token',
            ),
          )
      }

      const user = await userRepository.findOne({
        where: {
          id: decoded.id,
        },
      })
      if (!user) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json(generalResponse(StatusCodes.NOT_FOUND, {}, [], userNotFound))
      }

      if (user.role && !allowedRoles.includes(user.role)) {
        return res
          .status(StatusCodes.UNAUTHORIZED)
          .json(
            generalResponse(
              StatusCodes.UNAUTHORIZED,
              {},
              [],
              'Invalid role for this task',
            ),
          )
      }
      if (user.status === 'INACTIVE') {
        return res
          .status(StatusCodes.UNAUTHORIZED)
          .json(
            generalResponse(
              StatusCodes.UNAUTHORIZED,
              {},
              [],
              'User needs to be verified',
            ),
          )
      }
      req.user = user
      return next()
    } catch (error) {
      console.error(error)
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json(
          generalResponse(
            StatusCodes.UNAUTHORIZED,
            {},
            [],
            'Token has expired, please log in again',
          ),
        )
    }
  } else {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json(
        generalResponse(
          StatusCodes.BAD_REQUEST,
          {},
          [],
          'Invalid token or token is missing',
        ),
      )
  }
}
export default verifyToken
