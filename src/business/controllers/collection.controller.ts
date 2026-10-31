import { isUUID } from 'class-validator'
import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import Joi from 'joi'
import multer from 'multer'

import {
  MAX_PICKUP_PHOTOS,
  pickupPhotoUpload,
  removePickupPhoto,
  storePickupPhoto,
} from '../services/photos.service'
import { todayInLagos } from '../services/schedule.service'
import { MaterialEnum } from '../../@types/schedule'
import { AppDataSource } from '../../data-source'
import {
  BusinessPickup,
  BusinessPickupItem,
  BusinessPickupStatusEnum,
  PickupPhoto,
} from '../../entities/businessSchedule'
import { NotificationType } from '../../entities/notification'
import { User } from '../../entities/user'
import { generalResponse } from '../../helpers/constants'
import { notificationService } from '../../services/notification.service'
import catchController from '../../utils/catchControllerAsyncs'

const pickupRepository = AppDataSource.getRepository(BusinessPickup)

const respond = (
  res: Response,
  status: number,
  data: string | object,
  message: string,
) => res.status(status).json(generalResponse(status, data, [], message))

const MATERIAL_NAMES: Record<string, string> = {
  plastic: 'Plastic',
  paper: 'Paper',
  'e-waste': 'E-waste',
  organic: 'Organic',
  metal: 'Metal',
  glass: 'Glass',
  'mixed-waste': 'Mixed waste',
}

// kg with one decimal, e.g. 42.5
const roundKg = (n: number) => Math.round(n * 10) / 10
const formatKg = (n: number) =>
  `${roundKg(n).toLocaleString('en-NG', { maximumFractionDigits: 1 })} kg`

const itemsSchema = Joi.array()
  .items(
    Joi.object({
      material: Joi.string()
        .valid(...Object.values(MaterialEnum))
        .required(),
      weightKg: Joi.number().min(0.1).max(100000).required(),
    }),
  )
  .min(1)
  .unique('material')
  .required()
  .messages({
    'array.min': 'Add the weight of at least one material',
    'array.unique': 'Each material can only be listed once',
    'number.min': 'Weights must be at least 0.1 kg',
  })

const parseJson = (raw: unknown) => {
  if (typeof raw !== 'string') return raw
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

// Turns multer's errors (too many / too large / wrong type) into a 400
export const withPickupPhotos = (
  req: Request,
  res: Response,
  next: NextFunction,
) =>
  pickupPhotoUpload(req, res, (err: unknown) => {
    if (!err) return next()
    const message =
      err instanceof multer.MulterError
        ? err.code === 'LIMIT_FILE_SIZE'
          ? 'Each photo must be under 8 MB'
          : err.code === 'LIMIT_FILE_COUNT' ||
            err.code === 'LIMIT_UNEXPECTED_FILE'
          ? `Up to ${MAX_PICKUP_PHOTOS} photos per pickup`
          : err.message
        : (err as Error).message
    return respond(res, StatusCodes.BAD_REQUEST, {}, message)
  })

// Records (or corrects) what was collected: weight per material and photos.
// Multipart form: items (JSON), keepPhotos (JSON list of existing photo
// URLs to keep; default all), photos (files).
export const recordPickupCollection = catchController(
  async (req: Request, res: Response) => {
    const id = req.params.id as string
    const pickup = isUUID(id)
      ? await pickupRepository.findOne({
          where: { id },
          relations: ['business', 'items'],
        })
      : null
    if (!pickup) {
      return respond(res, StatusCodes.NOT_FOUND, {}, 'Pickup not found')
    }
    const { SCHEDULED, MISSED, COMPLETED } = BusinessPickupStatusEnum
    if (
      ![SCHEDULED, MISSED, COMPLETED].includes(
        pickup.status as BusinessPickupStatusEnum,
      )
    ) {
      return respond(
        res,
        StatusCodes.BAD_REQUEST,
        {},
        `A ${pickup.status} pickup can't be marked as collected`,
      )
    }
    if ((pickup.date as string) > todayInLagos()) {
      return respond(
        res,
        StatusCodes.BAD_REQUEST,
        {},
        "This pickup's date hasn't arrived yet",
      )
    }

    const { error, value: items } = itemsSchema.validate(
      parseJson(req.body.items),
    )
    if (error) return respond(res, StatusCodes.BAD_REQUEST, {}, error.message)

    const existing = pickup.photos ?? []
    const keepUrls = parseJson(req.body.keepPhotos)
    const kept = Array.isArray(keepUrls)
      ? existing.filter((p) => keepUrls.includes(p.url))
      : existing
    const files = (req.files as Express.Multer.File[] | undefined) ?? []
    if (kept.length + files.length > MAX_PICKUP_PHOTOS) {
      return respond(
        res,
        StatusCodes.BAD_REQUEST,
        {},
        `Up to ${MAX_PICKUP_PHOTOS} photos per pickup`,
      )
    }

    let added: PickupPhoto[] = []
    try {
      added = await Promise.all(files.map(storePickupPhoto))
    } catch (err) {
      console.error('Pickup photo upload failed', err)
      return respond(
        res,
        StatusCodes.BAD_GATEWAY,
        {},
        'Could not upload the photos. Please try again.',
      )
    }

    const firstTime = pickup.status !== COMPLETED
    const totalWeightKg = roundKg(
      items.reduce(
        (sum: number, i: { weightKg: number }) => sum + i.weightKg,
        0,
      ),
    )

    try {
      await AppDataSource.transaction(async (manager) => {
        await manager.delete(BusinessPickupItem, { pickup: { id: pickup.id } })
        pickup.items = items.map(
          (i: { material: MaterialEnum; weightKg: number }) =>
            manager.create(BusinessPickupItem, {
              material: i.material,
              weightKg: roundKg(i.weightKg),
            }),
        )
        pickup.status = COMPLETED
        pickup.collectedAt = pickup.collectedAt ?? new Date()
        pickup.totalWeightKg = totalWeightKg
        pickup.photos = [...kept, ...added]
        await manager.save(pickup)
      })
    } catch (err) {
      await Promise.all(added.map(removePickupPhoto))
      throw err
    }

    // Photos removed in this edit
    await Promise.all(
      existing.filter((p) => !kept.includes(p)).map(removePickupPhoto),
    )

    if (firstTime) {
      const breakdown = items
        .map(
          (i: { material: string; weightKg: number }) =>
            `${MATERIAL_NAMES[i.material] ?? i.material} ${formatKg(
              i.weightKg,
            )}`,
        )
        .join(', ')
      await notificationService.createNotification(
        pickup.business as User,
        'Pickup collected',
        `We collected ${formatKg(
          totalWeightKg,
        )} (${breakdown}). See Pickup data for photos.`,
        NotificationType.SCHEDULE,
      )
    }

    return respond(
      res,
      StatusCodes.OK,
      formatCollectedPickup(pickup),
      firstTime ? 'Collection recorded' : 'Collection updated',
    )
  },
)

export const formatCollectedPickup = (p: BusinessPickup) => ({
  id: p.id,
  date: p.date,
  window: p.window,
  kind: p.kind,
  status: p.status,
  collectedAt: p.collectedAt,
  totalWeightKg: p.totalWeightKg == null ? null : Number(p.totalWeightKg),
  items: (p.items ?? [])
    .map((i) => ({ material: i.material, weightKg: Number(i.weightKg) }))
    .sort((a, b) => b.weightKg - a.weightKg),
  photos: (p.photos ?? []).map((ph) => ph.url),
  adminNote: p.adminNote,
})
