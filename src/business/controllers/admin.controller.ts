import { isUUID } from 'class-validator'
import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import Joi from 'joi'
import { In, LessThan, MoreThanOrEqual, Not } from 'typeorm'

import { formatCollectedPickup } from './collection.controller'
import {
  ACTIVE_STATUSES,
  formatPickup,
  formatPlan,
  hasActivePickupOn,
  isValidDate,
  syncPlanPickups,
  todayInLagos,
} from '../services/schedule.service'
import { UserRoleEnum } from '../../@types/user'
import { AppDataSource } from '../../data-source'
import { BusinessProfile } from '../../entities/businessProfile'
import {
  BusinessPickup,
  BusinessPickupKindEnum,
  BusinessPickupStatusEnum,
  BusinessSchedulePlan,
  PickupWindowEnum,
  PlanFrequencyEnum,
} from '../../entities/businessSchedule'
import { NotificationType } from '../../entities/notification'
import { User } from '../../entities/user'
import { generalResponse } from '../../helpers/constants'
import { notificationService } from '../../services/notification.service'
import catchController from '../../utils/catchControllerAsyncs'

const userRepository = AppDataSource.getRepository(User)
const profileRepository = AppDataSource.getRepository(BusinessProfile)
const planRepository = AppDataSource.getRepository(BusinessSchedulePlan)
const pickupRepository = AppDataSource.getRepository(BusinessPickup)

const respond = (
  res: Response,
  status: number,
  data: string | object,
  message: string,
) => res.status(status).json(generalResponse(status, data, [], message))

const BUSINESS_NOT_FOUND = 'Business not found'
const FUTURE_DATE_ONLY = 'Choose today or a future date'
const BUSINESS_ID_COLUMN = 'p.businessId'
// Adds " <note>" to a message when there is one
const withNote = (note: string | null) => (note ? ` ${note}` : '')

const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]
const WINDOWS: Record<string, string> = {
  morning: 'morning (8am – 12pm)',
  afternoon: 'afternoon (12pm – 4pm)',
}
const ordinal = (n: number) =>
  `${n}${
    [11, 12, 13].includes(n % 100)
      ? 'th'
      : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ??
        'th'
  }`

const describePlan = (plan: BusinessSchedulePlan) => {
  const when = WINDOWS[plan.window as string]
  switch (plan.frequency) {
    case PlanFrequencyEnum.WEEKLY:
      return `every ${DAYS[plan.dayOfWeek as number]}, ${when}`
    case PlanFrequencyEnum.BIWEEKLY:
      return `every other ${DAYS[plan.dayOfWeek as number]}, ${when}`
    case PlanFrequencyEnum.MONTHLY:
      return `on the ${ordinal(
        plan.dayOfMonth as number,
      )} of every month, ${when}`
    default:
      return 'on dates agreed with the Carus team'
  }
}

const describeDate = (date: string, window: string) => {
  const day = new Date(date + 'T12:00:00Z').toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
  return `${day}, ${WINDOWS[window]}`
}

const notify = (business: User, title: string, message: string) =>
  notificationService.createNotification(
    business,
    title,
    message,
    NotificationType.SCHEDULE,
  )

const findBusiness = async (id: string) =>
  isUUID(id)
    ? userRepository.findOne({ where: { id, role: UserRoleEnum.BUSINESS } })
    : null

const formatBusinessSummary = (
  user: User,
  profile: BusinessProfile | undefined,
) => ({
  id: user.id,
  email: user.email,
  first_name: user.first_name,
  last_name: user.last_name,
  phone: user.phone,
  country_code: user.country_code,
  status: user.status,
  isDisabled: user.isDisabled,
  createdAt: user.createdAt,
  business: profile
    ? {
        companyName: profile.companyName,
        industry: profile.industry,
        cacNumber: profile.cacNumber,
        address: profile.address,
        city: profile.city,
        contactRole: profile.contactRole,
        wasteTypes: profile.wasteTypes,
        estimatedMonthlyKg: profile.estimatedMonthlyKg,
      }
    : null,
})

// Admin view of a pickup, including what was collected
const formatAdminPickup = (p: BusinessPickup) => {
  const { items, photos } = formatCollectedPickup(p)
  return { ...formatPickup(p), items, photos }
}

/* ---------- Businesses ---------- */

export const listBusinesses = catchController(
  async (_req: Request, res: Response) => {
    const users = await userRepository.find({
      where: { role: UserRoleEnum.BUSINESS },
      order: { createdAt: 'DESC' },
    })
    const ids = users.map((u) => u.id as string)
    if (!ids.length) return respond(res, StatusCodes.OK, [], 'Success')

    const today = todayInLagos()
    const [profiles, plans, requested, upcoming] = await Promise.all([
      profileRepository.find({
        where: { user: { id: In(ids) } },
        relations: ['user'],
      }),
      planRepository.find({
        where: { business: { id: In(ids) } },
        relations: ['business'],
      }),
      pickupRepository
        .createQueryBuilder('p')
        .select(BUSINESS_ID_COLUMN, 'businessId')
        .addSelect('COUNT(*)', 'count')
        .where('p.status = :status', {
          status: BusinessPickupStatusEnum.REQUESTED,
        })
        .groupBy(BUSINESS_ID_COLUMN)
        .getRawMany(),
      pickupRepository
        .createQueryBuilder('p')
        .select(BUSINESS_ID_COLUMN, 'businessId')
        .addSelect("TO_CHAR(MIN(p.date), 'YYYY-MM-DD')", 'next')
        .where('p.status IN (:...statuses)', { statuses: ACTIVE_STATUSES })
        .andWhere('p.date >= :today', { today })
        .groupBy(BUSINESS_ID_COLUMN)
        .getRawMany(),
    ])

    const byUser = <T extends { user?: User; business?: User }>(rows: T[]) =>
      new Map(rows.map((r) => [(r.user ?? r.business)?.id, r]))
    const profileMap = byUser(profiles)
    const planMap = byUser(plans)
    const requestedMap = new Map(
      requested.map((r) => [r.businessId, Number(r.count)]),
    )
    const nextMap = new Map(upcoming.map((r) => [r.businessId, r.next]))

    return respond(
      res,
      StatusCodes.OK,
      users.map((u) => ({
        ...formatBusinessSummary(u, profileMap.get(u.id)),
        plan: formatPlan(planMap.get(u.id) ?? null),
        pendingRequests: requestedMap.get(u.id) ?? 0,
        nextPickup: nextMap.get(u.id) ?? null,
      })),
      'Success',
    )
  },
)

export const getBusinessDetail = catchController(
  async (req: Request, res: Response) => {
    const business = await findBusiness(req.params.id as string)
    if (!business) {
      return respond(res, StatusCodes.NOT_FOUND, {}, BUSINESS_NOT_FOUND)
    }
    await syncPlanPickups(business)

    const today = todayInLagos()
    const [profile, plan, upcoming, past] = await Promise.all([
      profileRepository.findOne({ where: { user: { id: business.id } } }),
      planRepository.findOne({ where: { business: { id: business.id } } }),
      pickupRepository.find({
        where: { business: { id: business.id }, date: MoreThanOrEqual(today) },
        relations: ['items'],
        order: { date: 'ASC' },
      }),
      pickupRepository.find({
        where: { business: { id: business.id }, date: LessThan(today) },
        relations: ['items'],
        order: { date: 'DESC' },
        take: 30,
      }),
    ])

    return respond(
      res,
      StatusCodes.OK,
      {
        ...formatBusinessSummary(business, profile ?? undefined),
        today,
        plan: formatPlan(plan),
        upcoming: upcoming.map(formatAdminPickup),
        past: past.map(formatAdminPickup),
      },
      'Success',
    )
  },
)

/* ---------- Plan ---------- */

const planSchema = Joi.object({
  frequency: Joi.string()
    .valid(...Object.values(PlanFrequencyEnum))
    .required(),
  dayOfWeek: Joi.when('frequency', {
    is: Joi.valid(PlanFrequencyEnum.WEEKLY, PlanFrequencyEnum.BIWEEKLY),
    then: Joi.number().integer().min(1).max(6).required(),
    otherwise: Joi.any().strip(),
  }),
  dayOfMonth: Joi.when('frequency', {
    is: PlanFrequencyEnum.MONTHLY,
    then: Joi.number().integer().min(1).max(28).required(),
    otherwise: Joi.any().strip(),
  }),
  window: Joi.string()
    .valid(...Object.values(PickupWindowEnum))
    .required(),
  startDate: Joi.string().allow('', null),
  notes: Joi.string().trim().max(1000).allow('', null),
}).messages({
  'number.max': 'Choose a day from Monday to Saturday (or 1st – 28th)',
})

export const setBusinessPlan = catchController(
  async (req: Request, res: Response) => {
    const business = await findBusiness(req.params.id as string)
    if (!business) {
      return respond(res, StatusCodes.NOT_FOUND, {}, BUSINESS_NOT_FOUND)
    }
    const { error, value } = planSchema.validate(req.body)
    if (error) return respond(res, StatusCodes.BAD_REQUEST, {}, error.message)

    const today = todayInLagos()
    const startDate = value.startDate || today
    if (!isValidDate(startDate)) {
      return respond(res, StatusCodes.BAD_REQUEST, {}, 'Invalid start date')
    }

    const existingPlan = await planRepository.findOne({
      where: { business: { id: business.id } },
    })
    const plan = existingPlan ?? planRepository.create({ business })
    plan.frequency = value.frequency
    plan.dayOfWeek = value.dayOfWeek ?? null
    plan.dayOfMonth = value.dayOfMonth ?? null
    plan.window = value.window
    plan.startDate = startDate < today ? today : startDate
    plan.notes = value.notes || null
    await planRepository.save(plan)
    await syncPlanPickups(business)

    await notify(
      business,
      existingPlan ? 'Your pickup plan was updated' : 'Your pickup plan is set',
      `Carus will collect ${describePlan(plan)}.`,
    )
    return respond(res, StatusCodes.OK, formatPlan(plan) ?? {}, 'Plan saved')
  },
)

/* ---------- Pickups ---------- */

const addPickupSchema = Joi.object({
  date: Joi.string().required(),
  window: Joi.string()
    .valid(...Object.values(PickupWindowEnum))
    .required(),
  note: Joi.string().trim().max(500).allow('', null),
})

export const addBusinessPickup = catchController(
  async (req: Request, res: Response) => {
    const business = await findBusiness(req.params.id as string)
    if (!business) {
      return respond(res, StatusCodes.NOT_FOUND, {}, BUSINESS_NOT_FOUND)
    }
    const { error, value } = addPickupSchema.validate(req.body)
    if (error) return respond(res, StatusCodes.BAD_REQUEST, {}, error.message)
    if (!isValidDate(value.date) || value.date < todayInLagos()) {
      return respond(res, StatusCodes.BAD_REQUEST, {}, FUTURE_DATE_ONLY)
    }
    if (await hasActivePickupOn(business.id as string, value.date)) {
      return respond(
        res,
        StatusCodes.CONFLICT,
        {},
        'This business already has a pickup on that day',
      )
    }

    const pickup = await pickupRepository.save(
      pickupRepository.create({
        business,
        date: value.date,
        window: value.window,
        kind: BusinessPickupKindEnum.SCHEDULED,
        status: BusinessPickupStatusEnum.SCHEDULED,
        adminNote: value.note || null,
      }),
    )
    await notify(
      business,
      'Pickup scheduled',
      `Carus will collect on ${describeDate(value.date, value.window)}.`,
    )
    return respond(
      res,
      StatusCodes.CREATED,
      formatPickup(pickup),
      'Pickup added',
    )
  },
)

const updatePickupSchema = Joi.object({
  action: Joi.string()
    .valid('approve', 'decline', 'cancel', 'missed', 'reschedule')
    .required(),
  date: Joi.when('action', {
    is: 'reschedule',
    then: Joi.string().required(),
  }),
  window: Joi.string().valid(...Object.values(PickupWindowEnum)),
  note: Joi.string().trim().max(500).allow('', null),
})

const { REQUESTED, SCHEDULED, MISSED, CANCELLED, DECLINED } =
  BusinessPickupStatusEnum

// Which statuses each action can be applied to
const ALLOWED_FROM: Record<string, BusinessPickupStatusEnum[]> = {
  approve: [REQUESTED],
  decline: [REQUESTED],
  cancel: [REQUESTED, SCHEDULED],
  missed: [SCHEDULED],
  reschedule: [REQUESTED, SCHEDULED],
}

export const updateBusinessPickup = catchController(
  async (req: Request, res: Response) => {
    const id = req.params.id as string
    const pickup = isUUID(id)
      ? await pickupRepository.findOne({
          where: { id },
          relations: ['business'],
        })
      : null
    if (!pickup) {
      return respond(res, StatusCodes.NOT_FOUND, {}, 'Pickup not found')
    }
    const { error, value } = updatePickupSchema.validate(req.body)
    if (error) return respond(res, StatusCodes.BAD_REQUEST, {}, error.message)

    const { action } = value as { action: string }
    if (
      !ALLOWED_FROM[action].includes(pickup.status as BusinessPickupStatusEnum)
    ) {
      return respond(
        res,
        StatusCodes.BAD_REQUEST,
        {},
        `A ${pickup.status} pickup can't be changed that way`,
      )
    }

    const business = pickup.business as User
    const note = value.note || null
    const when = () =>
      describeDate(pickup.date as string, pickup.window as string)

    switch (action) {
      case 'approve':
        pickup.status = SCHEDULED
        pickup.adminNote = note
        await notify(
          business,
          'Quick pickup confirmed',
          `Your pickup on ${when()} is confirmed.`,
        )
        break
      case 'decline':
        pickup.status = DECLINED
        pickup.adminNote = note
        await notify(
          business,
          'Quick pickup not available',
          `We can't collect on ${when()}.${withNote(note)}`,
        )
        break
      case 'cancel':
        pickup.status = CANCELLED
        pickup.adminNote = note
        await notify(
          business,
          'Pickup cancelled',
          `Your pickup on ${when()} has been cancelled.${withNote(note)}`,
        )
        break
      case 'missed':
        pickup.status = MISSED
        pickup.adminNote = note
        break
      case 'reschedule': {
        if (!isValidDate(value.date) || value.date < todayInLagos()) {
          return respond(res, StatusCodes.BAD_REQUEST, {}, FUTURE_DATE_ONLY)
        }
        if (
          value.date !== pickup.date &&
          (await pickupRepository.exist({
            where: {
              business: { id: business.id },
              date: value.date,
              status: In(ACTIVE_STATUSES),
              id: Not(pickup.id as string),
            },
          }))
        ) {
          return respond(
            res,
            StatusCodes.CONFLICT,
            {},
            'This business already has a pickup on that day',
          )
        }
        const before = when()
        pickup.date = value.date
        if (value.window) pickup.window = value.window
        // Detach from the plan so syncing doesn't move it back
        pickup.fromPlan = false
        if (pickup.status === REQUESTED) pickup.status = SCHEDULED
        pickup.adminNote = note
        await notify(
          business,
          'Pickup moved',
          `Your pickup on ${before} has moved to ${when()}.`,
        )
        break
      }
    }

    await pickupRepository.save(pickup)
    return respond(res, StatusCodes.OK, formatPickup(pickup), 'Pickup updated')
  },
)

export const listPickupRequests = catchController(
  async (_req: Request, res: Response) => {
    const requests = await pickupRepository.find({
      where: { status: REQUESTED },
      relations: ['business'],
      order: { date: 'ASC' },
    })
    const ids = [...new Set(requests.map((r) => r.business?.id as string))]
    const profiles = ids.length
      ? await profileRepository.find({
          where: { user: { id: In(ids) } },
          relations: ['user'],
        })
      : []
    const names = new Map(profiles.map((p) => [p.user?.id, p.companyName]))

    return respond(
      res,
      StatusCodes.OK,
      requests.map((r) => ({
        ...formatPickup(r),
        business: {
          id: r.business?.id,
          companyName: names.get(r.business?.id) ?? null,
        },
      })),
      'Success',
    )
  },
)
