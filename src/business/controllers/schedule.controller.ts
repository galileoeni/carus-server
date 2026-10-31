import { isUUID } from 'class-validator'
import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import Joi from 'joi'
import { In, LessThan, MoreThanOrEqual, Not } from 'typeorm'

import {
  formatPickup,
  formatPlan,
  hasActivePickupOn,
  quickPickupDateError,
  syncPlanPickups,
  todayInLagos,
} from '../services/schedule.service'
import { AppDataSource } from '../../data-source'
import {
  BusinessPickup,
  BusinessPickupKindEnum,
  BusinessPickupStatusEnum,
  BusinessSchedulePlan,
  PickupWindowEnum,
} from '../../entities/businessSchedule'
import { User } from '../../entities/user'
import { generalResponse } from '../../helpers/constants'
import catchController from '../../utils/catchControllerAsyncs'

const pickupRepository = AppDataSource.getRepository(BusinessPickup)
const planRepository = AppDataSource.getRepository(BusinessSchedulePlan)

const respond = (
  res: Response,
  status: number,
  data: string | object,
  message: string,
) => res.status(status).json(generalResponse(status, data, [], message))

const quickPickupSchema = Joi.object({
  date: Joi.string().required(),
  window: Joi.string()
    .valid(...Object.values(PickupWindowEnum))
    .required(),
  note: Joi.string().trim().max(500).allow('', null),
})

export const getBusinessSchedule = catchController(
  async (req: Request, res: Response) => {
    const business = req.user as User
    await syncPlanPickups(business)

    const today = todayInLagos()
    const [plan, upcoming, past] = await Promise.all([
      planRepository.findOne({ where: { business: { id: business.id } } }),
      pickupRepository.find({
        where: {
          business: { id: business.id },
          date: MoreThanOrEqual(today),
          status: Not(In([BusinessPickupStatusEnum.CANCELLED])),
        },
        order: { date: 'ASC' },
      }),
      pickupRepository.find({
        where: { business: { id: business.id }, date: LessThan(today) },
        order: { date: 'DESC' },
        take: 20,
      }),
    ])

    return respond(
      res,
      StatusCodes.OK,
      {
        today,
        plan: formatPlan(plan),
        upcoming: upcoming.map(formatPickup),
        past: past.map(formatPickup),
      },
      'Success',
    )
  },
)

export const requestQuickPickup = catchController(
  async (req: Request, res: Response) => {
    const business = req.user as User
    const { error, value } = quickPickupSchema.validate(req.body)
    if (error) {
      return respond(res, StatusCodes.BAD_REQUEST, {}, error.message)
    }

    const dateError = quickPickupDateError(value.date)
    if (dateError) return respond(res, StatusCodes.BAD_REQUEST, {}, dateError)

    if (await hasActivePickupOn(business.id as string, value.date)) {
      return respond(
        res,
        StatusCodes.CONFLICT,
        {},
        'You already have a pickup on this day',
      )
    }

    const pickup = await pickupRepository.save(
      pickupRepository.create({
        business,
        date: value.date,
        window: value.window,
        kind: BusinessPickupKindEnum.QUICK,
        status: BusinessPickupStatusEnum.REQUESTED,
        requestNote: value.note || null,
      }),
    )

    return respond(
      res,
      StatusCodes.CREATED,
      formatPickup(pickup),
      'Pickup requested. The Carus team will confirm it shortly.',
    )
  },
)

// A business can cancel its own requested or scheduled pickup, up to the day
// before
export const cancelBusinessPickup = catchController(
  async (req: Request, res: Response) => {
    const business = req.user as User
    const id = req.params.id as string
    const pickup = isUUID(id)
      ? await pickupRepository.findOne({
          where: { id, business: { id: business.id } },
        })
      : null
    if (!pickup) {
      return respond(res, StatusCodes.NOT_FOUND, {}, 'Pickup not found')
    }
    if (
      ![
        BusinessPickupStatusEnum.REQUESTED,
        BusinessPickupStatusEnum.SCHEDULED,
      ].includes(pickup.status as BusinessPickupStatusEnum)
    ) {
      return respond(
        res,
        StatusCodes.BAD_REQUEST,
        {},
        'This pickup can no longer be cancelled',
      )
    }
    if ((pickup.date as string) <= todayInLagos()) {
      return respond(
        res,
        StatusCodes.BAD_REQUEST,
        {},
        'Pickups can be cancelled up to the day before. Please contact Carus.',
      )
    }

    pickup.status = BusinessPickupStatusEnum.CANCELLED
    await pickupRepository.save(pickup)
    return respond(
      res,
      StatusCodes.OK,
      formatPickup(pickup),
      'Pickup cancelled',
    )
  },
)
