import type { Filters, Summary } from '@/domain/types'
import { addDays, localDateKey, parseDateKey } from '@/shared/dates'

/** Same length as the active period, ending the day before it starts. */
export function previousPeriod(filters: Filters): { desde: string; hasta: string } {
  const start = parseDateKey(filters.desde)
  const end = parseDateKey(filters.hasta)
  const length = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1)
  const previousEnd = addDays(start, -1)

  return {
    desde: localDateKey(addDays(previousEnd, -(length - 1))),
    hasta: localDateKey(previousEnd),
  }
}

/** Percentage change, or `null` when there is nothing to compare against. */
export function deltaPercent(current: number, previous: number): number | null {
  if (!Number.isFinite(previous) || previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

export interface KpiDelta {
  value: number | null
  direction: 'up' | 'down' | 'flat'
}

export function kpiDelta(key: keyof Summary, current: Summary, previous?: Summary): KpiDelta {
  const currentValue = current[key]
  const previousValue = previous?.[key]

  if (currentValue === null || previousValue === null || previousValue === undefined) {
    return { value: null, direction: 'flat' }
  }

  const value = deltaPercent(currentValue, previousValue)
  if (value === null) return { value: null, direction: 'flat' }

  return { value, direction: value > 0 ? 'up' : value < 0 ? 'down' : 'flat' }
}
