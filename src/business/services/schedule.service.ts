import { In, MoreThanOrEqual } from 'typeorm'

import { AppDataSource } from '../../data-source'
import {
  BusinessPickup,
  BusinessPickupKindEnum,
  BusinessPickupStatusEnum,
  BusinessSchedulePlan,
  PlanFrequencyEnum,
} from '../../entities/businessSchedule'
import { User } from '../../entities/user'

// Plan pickups are kept on the calendar this far ahead
export const PLAN_HORIZON_DAYS = 56
// Quick pickups can be requested from tomorrow up to this many days ahead
export const QUICK_MAX_DAYS_AHEAD = 14

const pickupRepository = () => AppDataSource.getRepository(BusinessPickup)
const planRepository = () => AppDataSource.getRepository(BusinessSchedulePlan)

/* ---------- Dates (YYYY-MM-DD, Lagos time) ---------- */

export const todayInLagos = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(
    new Date(),
  )

const toUtc = (date: string) => {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}
const fromUtc = (d: Date) => d.toISOString().slice(0, 10)

export const addDays = (date: string, days: number) => {
  const d = toUtc(date)
  d.setUTCDate(d.getUTCDate() + days)
  return fromUtc(d)
}

export const daysBetween = (from: string, to: string) =>
  Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / 86_400_000)

// 0 = Sunday ... 6 = Saturday
export const weekday = (date: string) => toUtc(date).getUTCDay()

export const isValidDate = (date: unknown): date is string =>
  typeof date === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(date) &&
  fromUtc(toUtc(date)) === date

/* ---------- Plans ---------- */

// Every collection date the plan produces between `from` and `to` (inclusive)
export function planDates(
  plan: Pick<
    BusinessSchedulePlan,
    'frequency' | 'dayOfWeek' | 'dayOfMonth' | 'startDate'
  >,
  from: string,
  to: string,
): string[] {
  const start = plan.startDate as string
  const first = start > from ? start : from
  const dates: string[] = []

  if (
    plan.frequency === PlanFrequencyEnum.WEEKLY ||
    plan.frequency === PlanFrequencyEnum.BIWEEKLY
  ) {
    const step = plan.frequency === PlanFrequencyEnum.WEEKLY ? 7 : 14
    // First matching weekday on or after the plan's start date
    let anchor = start
    while (weekday(anchor) !== plan.dayOfWeek) anchor = addDays(anchor, 1)
    // Jump to the first occurrence on or after `first`
    let d = anchor
    if (d < first) {
      const behind = daysBetween(d, first)
      d = addDays(d, Math.ceil(behind / step) * step)
    }
    for (; d <= to; d = addDays(d, step)) dates.push(d)
  } else if (plan.frequency === PlanFrequencyEnum.MONTHLY && plan.dayOfMonth) {
    const [y, m] = first.split('-').map(Number)
    for (let i = 0; ; i++) {
      const month = new Date(Date.UTC(y, m - 1 + i, plan.dayOfMonth))
      let d = fromUtc(month)
      // No Sunday collections: move to the Monday after
      if (weekday(d) === 0) d = addDays(d, 1)
      if (d > to && fromUtc(month) > to) break
      if (d >= first && d <= to) dates.push(d)
    }
  }
  return dates
}

// Keeps the business's calendar in line with its plan: adds missing plan
// pickups up to the horizon and removes future ones the plan no longer
// produces (e.g. after the day changed). Pickups that were completed,
// cancelled or moved by the team are left alone.
export async function syncPlanPickups(business: User) {
  const businessId = business.id as string
  const plan = await planRepository().findOne({
    where: { business: { id: businessId } },
  })
  const today = todayInLagos()
  const horizon = addDays(today, PLAN_HORIZON_DAYS)
  const wanted = new Set(
    plan && plan.frequency !== PlanFrequencyEnum.FLEXIBLE
      ? planDates(plan, today, horizon)
      : [],
  )

  const existing = await pickupRepository().find({
    where: {
      business: { id: businessId },
      fromPlan: true,
      date: MoreThanOrEqual(today),
    },
  })

  const stale = existing.filter(
    (p) =>
      p.status === BusinessPickupStatusEnum.SCHEDULED &&
      (!wanted.has(p.date as string) || p.window !== plan?.window),
  )
  if (stale.length) await pickupRepository().remove(stale)

  const kept = new Set(
    existing.filter((p) => !stale.includes(p)).map((p) => p.date),
  )
  const toCreate = [...wanted]
    .filter((d) => !kept.has(d))
    .map((date) => ({
      business,
      date,
      window: plan?.window,
      kind: BusinessPickupKindEnum.SCHEDULED,
      status: BusinessPickupStatusEnum.SCHEDULED,
      fromPlan: true,
    }))
  if (toCreate.length) {
    // orIgnore: another request may have just added the same dates
    await pickupRepository()
      .createQueryBuilder()
      .insert()
      .values(toCreate)
      .orIgnore()
      .execute()
  }
}

/* ---------- Quick pickups ---------- */

// Returns an error message, or null if the date can be requested
export function quickPickupDateError(date: string): string | null {
  if (!isValidDate(date)) return 'Choose a valid date'
  const ahead = daysBetween(todayInLagos(), date)
  if (ahead < 1) return 'Quick pickups can be booked from tomorrow onwards'
  if (ahead > QUICK_MAX_DAYS_AHEAD) {
    return `Quick pickups can be booked up to ${QUICK_MAX_DAYS_AHEAD} days ahead`
  }
  if (weekday(date) === 0) return 'We don’t collect on Sundays'
  return null
}

// Statuses that occupy a date on the calendar
export const ACTIVE_STATUSES = [
  BusinessPickupStatusEnum.REQUESTED,
  BusinessPickupStatusEnum.SCHEDULED,
]

export async function hasActivePickupOn(businessId: string, date: string) {
  return pickupRepository().exist({
    where: {
      business: { id: businessId },
      date,
      status: In(ACTIVE_STATUSES),
    },
  })
}

/* ---------- Output ---------- */

export const formatPlan = (plan: BusinessSchedulePlan | null) =>
  plan && {
    frequency: plan.frequency,
    dayOfWeek: plan.dayOfWeek,
    dayOfMonth: plan.dayOfMonth,
    window: plan.window,
    startDate: plan.startDate,
    notes: plan.notes,
    updatedAt: plan.updatedAt,
  }

export const formatPickup = (p: BusinessPickup) => ({
  id: p.id,
  date: p.date,
  window: p.window,
  kind: p.kind,
  status: p.status,
  requestNote: p.requestNote,
  adminNote: p.adminNote,
  totalWeightKg: p.totalWeightKg == null ? null : Number(p.totalWeightKg),
  createdAt: p.createdAt,
})
