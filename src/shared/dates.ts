/** Calendar-day keys are local `YYYY-MM-DD` strings; instants are ISO 8601 UTC. */

export function localDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Date part of an ISO instant, expressed as the user's local calendar day. */
export function dateKeyOf(isoInstant: string): string {
  return localDateKey(new Date(isoInstant))
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

/** Inclusive range of the last `days` calendar days, ending today. */
export function lastDaysRange(days: number, today: Date = new Date()): {
  desde: string
  hasta: string
} {
  return {
    desde: localDateKey(addDays(today, -(days - 1))),
    hasta: localDateKey(today),
  }
}

/**
 * Default period the dashboard opens with: yesterday → tomorrow.
 *
 * One day on each side of today so the current day is always inside the range,
 * even when the database clock (which stamps `fch_servidor`) runs a few hours
 * ahead or behind the browser. Widen `DEFAULT_RANGE_BEFORE_DAYS` to see more
 * history by default; nothing else needs to change.
 */
export const DEFAULT_RANGE_BEFORE_DAYS = 1
export const DEFAULT_RANGE_AFTER_DAYS = 1

export function defaultReportRange(today: Date = new Date()): {
  desde: string
  hasta: string
} {
  return {
    desde: localDateKey(addDays(today, -DEFAULT_RANGE_BEFORE_DAYS)),
    hasta: localDateKey(addDays(today, DEFAULT_RANGE_AFTER_DAYS)),
  }
}

export function isWithinRange(dateKey: string, desde: string, hasta: string): boolean {
  return dateKey >= desde && dateKey <= hasta
}
