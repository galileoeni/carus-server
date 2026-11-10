import bcrypt from 'bcryptjs'
import { isUUID } from 'class-validator'
import { randomBytes } from 'crypto'
import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { In, IsNull, MoreThan, MoreThanOrEqual, Not } from 'typeorm'

import {
  findProfile,
  loginTakenError,
  newBusinessUser,
  normalisePhone,
} from './auth.controller'
import { buildBusinessData } from './data.controller'
import {
  ACTIVE_STATUSES,
  formatPickup,
  formatPlan,
  syncPlanPickups,
  todayInLagos,
} from '../services/schedule.service'
import { AppDataSource } from '../../data-source'
import { BusinessBranchInvite } from '../../entities/businessBranchInvite'
import { BusinessProfile } from '../../entities/businessProfile'
import {
  BusinessPickup,
  BusinessPickupStatusEnum,
  BusinessSchedulePlan,
} from '../../entities/businessSchedule'
import { User } from '../../entities/user'
import { generalResponse } from '../../helpers/constants'
import { sendVerificationOtp } from '../../helpers/emailService'
import catchController from '../../utils/catchControllerAsyncs'
import { emailFormat } from '../../utils/email'
import { formatJoiError } from '../../utils/helper'
import {
  branchInviteSchema,
  joinBranchSchema,
} from '../../utils/validators/business'

// Branch sign-up links stop working after this many days
const INVITE_DAYS = 14
const MAX_OPEN_INVITES = 20
const BUSINESS_ID = 'p.businessId'
const IN_IDS = 'p.businessId IN (:...ids)'
const INVITE_NOT_FOUND =
  'This link is invalid or has expired. Ask your head office for a new one.'

const profileRepository = AppDataSource.getRepository(BusinessProfile)
const inviteRepository = AppDataSource.getRepository(BusinessBranchInvite)
const pickupRepository = AppDataSource.getRepository(BusinessPickup)
const planRepository = AppDataSource.getRepository(BusinessSchedulePlan)

const respond = (
  res: Response,
  status: number,
  data: string | object,
  message: string,
) => res.status(status).json(generalResponse(status, data, [], message))

// The logged-in business's profile, or a 403 if it's a branch
async function hqProfile(req: Request, res: Response) {
  const profile = await findProfile((req.user as User).id)
  if (!profile) {
    respond(res, StatusCodes.NOT_FOUND, {}, 'Business profile not found')
    return null
  }
  if (profile.parent) {
    respond(
      res,
      StatusCodes.FORBIDDEN,
      {},
      'Only your head office can manage locations',
    )
    return null
  }
  return profile
}

const formatInvite = (i: BusinessBranchInvite) => ({
  id: i.id,
  token: i.token,
  branchName: i.branchName,
  expiresAt: i.expiresAt,
  createdAt: i.createdAt,
})

// An invite that can still be used
const openInvite = (token: string) =>
  inviteRepository.findOne({
    where: { token, usedAt: IsNull(), expiresAt: MoreThan(new Date()) },
    relations: ['parent'],
  })

/* ---------- HQ: locations ---------- */

export const listBranches = catchController(
  async (req: Request, res: Response) => {
    const hq = await hqProfile(req, res)
    if (!hq) return

    const [branches, invites] = await Promise.all([
      profileRepository.find({
        where: { parent: { id: hq.id } },
        relations: ['user'],
        order: { createdAt: 'ASC' },
      }),
      inviteRepository.find({
        where: {
          parent: { id: hq.id },
          usedAt: IsNull(),
          expiresAt: MoreThan(new Date()),
        },
        order: { createdAt: 'DESC' },
      }),
    ])

    // HQ plus every branch, so the page can show one row per location
    const ids = [
      (req.user as User).id as string,
      ...branches.map((b) => b.user?.id as string),
    ]
    const today = todayInLagos()
    const [totals, next, plans] = await Promise.all([
      pickupRepository
        .createQueryBuilder('p')
        .select(BUSINESS_ID, 'businessId')
        .addSelect('COALESCE(SUM(p.totalWeightKg), 0)', 'kg')
        .addSelect('COUNT(*)', 'pickups')
        .addSelect("TO_CHAR(MAX(p.date), 'YYYY-MM-DD')", 'last')
        .where(IN_IDS, { ids })
        .andWhere('p.status = :status', {
          status: BusinessPickupStatusEnum.COMPLETED,
        })
        .groupBy(BUSINESS_ID)
        .getRawMany(),
      pickupRepository
        .createQueryBuilder('p')
        .select(BUSINESS_ID, 'businessId')
        .addSelect("TO_CHAR(MIN(p.date), 'YYYY-MM-DD')", 'next')
        .where(IN_IDS, { ids })
        .andWhere('p.status IN (:...statuses)', { statuses: ACTIVE_STATUSES })
        .andWhere('p.date >= :today', { today })
        .groupBy(BUSINESS_ID)
        .getRawMany(),
      planRepository.find({
        where: { business: { id: In(ids) } },
        relations: ['business'],
      }),
    ])
    const totalMap = new Map(totals.map((t) => [t.businessId, t]))
    const nextMap = new Map(next.map((n) => [n.businessId, n.next]))
    const planMap = new Map(plans.map((p) => [p.business?.id, p]))

    const location = (userId: string, p: BusinessProfile) => {
      const t = totalMap.get(userId)
      return {
        id: userId,
        name: p.branchName ?? 'Head office',
        address: p.address,
        city: p.city,
        totalKg: t ? Math.round(Number(t.kg) * 10) / 10 : 0,
        pickups: t ? Number(t.pickups) : 0,
        lastPickup: t?.last ?? null,
        nextPickup: nextMap.get(userId) ?? null,
        plan: formatPlan(planMap.get(userId) ?? null),
      }
    }

    return respond(
      res,
      StatusCodes.OK,
      {
        hq: location((req.user as User).id as string, hq),
        branches: branches.map((b) => ({
          ...location(b.user?.id as string, b),
          contact: {
            name: `${b.user?.first_name ?? ''} ${
              b.user?.last_name ?? ''
            }`.trim(),
            email: b.user?.email,
            phone: b.user?.phone,
          },
          status: b.user?.status,
          joinedAt: b.createdAt,
        })),
        invites: invites.map(formatInvite),
      },
      'Success',
    )
  },
)

export const createBranchInvite = catchController(
  async (req: Request, res: Response) => {
    const hq = await hqProfile(req, res)
    if (!hq) return

    const { error, value } = branchInviteSchema.validate(req.body ?? {})
    if (error) return respond(res, StatusCodes.BAD_REQUEST, {}, error.message)

    const open = await inviteRepository.count({
      where: {
        parent: { id: hq.id },
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
    })
    if (open >= MAX_OPEN_INVITES) {
      return respond(
        res,
        StatusCodes.BAD_REQUEST,
        {},
        `You have ${MAX_OPEN_INVITES} unused links. Cancel some before creating more.`,
      )
    }

    const invite = await inviteRepository.save(
      inviteRepository.create({
        parent: hq,
        token: randomBytes(24).toString('base64url'),
        branchName: value.branchName || null,
        expiresAt: new Date(Date.now() + INVITE_DAYS * 86_400_000),
      }),
    )
    return respond(
      res,
      StatusCodes.CREATED,
      formatInvite(invite),
      'Sign-up link created',
    )
  },
)

export const revokeBranchInvite = catchController(
  async (req: Request, res: Response) => {
    const hq = await hqProfile(req, res)
    if (!hq) return

    const id = req.params.id as string
    const result = isUUID(id)
      ? await inviteRepository.delete({
          id,
          parent: { id: hq.id },
          usedAt: IsNull(),
        })
      : { affected: 0 }
    if (!result.affected) {
      return respond(res, StatusCodes.NOT_FOUND, {}, 'Link not found')
    }
    return respond(res, StatusCodes.OK, {}, 'Link cancelled')
  },
)

// One branch's pickup data and upcoming pickups, for its HQ
export const getBranchDetail = catchController(
  async (req: Request, res: Response) => {
    const hq = await hqProfile(req, res)
    if (!hq) return

    const id = req.params.id as string
    const branch = isUUID(id)
      ? await profileRepository.findOne({
          where: { user: { id }, parent: { id: hq.id } },
          relations: ['user'],
        })
      : null
    if (!branch?.user) {
      return respond(res, StatusCodes.NOT_FOUND, {}, 'Location not found')
    }

    await syncPlanPickups(branch.user)
    const [data, plan, upcoming] = await Promise.all([
      buildBusinessData(id),
      planRepository.findOne({ where: { business: { id } } }),
      pickupRepository.find({
        where: {
          business: { id },
          date: MoreThanOrEqual(todayInLagos()),
          status: Not(In([BusinessPickupStatusEnum.CANCELLED])),
        },
        order: { date: 'ASC' },
        take: 10,
      }),
    ])

    return respond(
      res,
      StatusCodes.OK,
      {
        branch: {
          id,
          name: branch.branchName,
          address: branch.address,
          city: branch.city,
          contact: {
            name: `${branch.user.first_name ?? ''} ${
              branch.user.last_name ?? ''
            }`.trim(),
            email: branch.user.email,
            phone: branch.user.phone,
          },
          joinedAt: branch.createdAt,
        },
        plan: formatPlan(plan),
        upcoming: upcoming.map(formatPickup),
        ...data,
      },
      'Success',
    )
  },
)

/* ---------- Public: join through a link ---------- */

export const getBranchInvite = catchController(
  async (req: Request, res: Response) => {
    const invite = await openInvite(req.params.token as string)
    if (!invite?.parent) {
      return respond(res, StatusCodes.NOT_FOUND, {}, INVITE_NOT_FOUND)
    }
    return respond(
      res,
      StatusCodes.OK,
      {
        companyName: invite.parent.companyName,
        industry: invite.parent.industry,
        wasteTypes: invite.parent.wasteTypes,
        branchName: invite.branchName,
        expiresAt: invite.expiresAt,
      },
      'Success',
    )
  },
)

export const joinAsBranch = catchController(
  async (req: Request, res: Response) => {
    const { error, value } = joinBranchSchema.validate(req.body)
    if (error) {
      const { details, message } = formatJoiError(error)
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(generalResponse(StatusCodes.BAD_REQUEST, {}, details, message))
    }

    const invite = await openInvite(req.params.token as string)
    const hq = invite?.parent
    if (!invite || !hq) {
      return respond(res, StatusCodes.NOT_FOUND, {}, INVITE_NOT_FOUND)
    }

    const email = value.email.toLowerCase()
    const phone = normalisePhone(value.phone)
    const taken = await loginTakenError(email, phone)
    if (taken) return respond(res, StatusCodes.CONFLICT, {}, taken)

    const otp = User.generateOTP()
    const joined = await AppDataSource.transaction(async (manager) => {
      // Claim the link first so two people can't use it at once
      const claim = await manager.update(
        BusinessBranchInvite,
        { id: invite.id, usedAt: IsNull() },
        { usedAt: new Date() },
      )
      if (!claim.affected) return false

      const user = newBusinessUser(manager, {
        ...value,
        email,
        phone,
        password: await bcrypt.hash(value.password, 10),
        avatarSeed: `${hq.companyName} ${value.branchName}`,
        otp,
      })
      await manager.save(user)

      const branch = await manager.save(
        manager.create(BusinessProfile, {
          user,
          parent: hq,
          branchName: value.branchName,
          companyName: hq.companyName,
          industry: hq.industry,
          cacNumber: hq.cacNumber ?? null,
          address: value.address,
          city: value.city,
          contactRole: value.contactRole || null,
          wasteTypes: value.wasteTypes ?? hq.wasteTypes,
          estimatedMonthlyKg: value.estimatedMonthlyKg ?? null,
        }),
      )
      await manager.update(BusinessBranchInvite, { id: invite.id }, { branch })
      return true
    })
    if (!joined) {
      return respond(res, StatusCodes.NOT_FOUND, {}, INVITE_NOT_FOUND)
    }

    sendVerificationOtp(value.first_name, email, otp)

    return respond(
      res,
      StatusCodes.CREATED,
      { email },
      `Branch account created, kindly verify your email ${emailFormat(email)}`,
    )
  },
)
