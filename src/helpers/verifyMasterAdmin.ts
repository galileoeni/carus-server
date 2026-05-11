import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { generalResponse } from './constants'
import { UserRoleEnum, UserRow } from '../@types/user'

async function verifyMasterAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> {
  // First check if user is authenticated and is an admin
  const user = req.user as
    | (UserRow & {
        admin_type?: 'master' | 'base'
      })
    | undefined

  if (!user) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json(
        generalResponse(
          StatusCodes.UNAUTHORIZED,
          {},
          [],
          'Authentication required',
        ),
      )
  }

  // Check if user has admin role
  if (
    user.role !== UserRoleEnum.ADMIN &&
    user.role !== UserRoleEnum.SUPERADMIN
  ) {
    return res
      .status(StatusCodes.FORBIDDEN)
      .json(
        generalResponse(
          StatusCodes.FORBIDDEN,
          {},
          [],
          'Admin access required',
        ),
      )
  }

  // Check if user is a master admin
  if (user.admin_type !== 'master') {
    return res
      .status(StatusCodes.FORBIDDEN)
      .json(
        generalResponse(
          StatusCodes.FORBIDDEN,
          {},
          [],
          'Master admin access required',
        ),
      )
  }

  return next()
}

export default verifyMasterAdmin
