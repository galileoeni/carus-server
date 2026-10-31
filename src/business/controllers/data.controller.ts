import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { formatCollectedPickup } from './collection.controller'
import { MaterialEnum } from '../../@types/schedule'
import { AppDataSource } from '../../data-source'
import {
  BusinessPickup,
  BusinessPickupStatusEnum,
} from '../../entities/businessSchedule'
import { User } from '../../entities/user'
import { generalResponse } from '../../helpers/constants'
import catchController from '../../utils/catchControllerAsyncs'

// Same conservative factor as the website's impact page (lib/impact.ts):
// kg of CO2e avoided per kg of plastic recycled. Only plastic is counted.
const CO2_KG_PER_KG_PLASTIC = 1.5

const pickupRepository = AppDataSource.getRepository(BusinessPickup)
const round1 = (n: number) => Math.round(n * 10) / 10

export const getBusinessData = catchController(
  async (req: Request, res: Response) => {
    const business = req.user as User
    const pickups = await pickupRepository.find({
      where: {
        business: { id: business.id },
        status: BusinessPickupStatusEnum.COMPLETED,
      },
      relations: ['items'],
      order: { date: 'DESC' },
    })

    const byMaterial = new Map<string, number>()
    const byMonth = new Map<string, { kg: number; pickups: number }>()
    for (const p of pickups) {
      const month = (p.date as string).slice(0, 7)
      const m = byMonth.get(month) ?? { kg: 0, pickups: 0 }
      m.pickups += 1
      for (const item of p.items ?? []) {
        const kg = Number(item.weightKg)
        byMaterial.set(
          item.material as string,
          (byMaterial.get(item.material as string) ?? 0) + kg,
        )
        m.kg += kg
      }
      byMonth.set(month, m)
    }

    const totalKg = [...byMaterial.values()].reduce((a, b) => a + b, 0)
    const plasticKg = byMaterial.get(MaterialEnum.PLASTIC) ?? 0

    return res.status(StatusCodes.OK).json(
      generalResponse(
        StatusCodes.OK,
        {
          summary: {
            totalKg: round1(totalKg),
            pickups: pickups.length,
            plasticKg: round1(plasticKg),
            co2AvoidedKg: round1(plasticKg * CO2_KG_PER_KG_PLASTIC),
            byMaterial: [...byMaterial.entries()]
              .map(([material, kg]) => ({ material, kg: round1(kg) }))
              .sort((a, b) => b.kg - a.kg),
            months: [...byMonth.entries()]
              .map(([month, m]) => ({
                month,
                kg: round1(m.kg),
                pickups: m.pickups,
              }))
              .sort((a, b) => b.month.localeCompare(a.month)),
          },
          pickups: pickups.map(formatCollectedPickup),
        },
        [],
        'Success',
      ),
    )
  },
)
