import { describe, expect, it } from 'vitest'
import {
  DEFAULT_RANGE_AFTER_DAYS,
  DEFAULT_RANGE_BEFORE_DAYS,
  defaultReportRange,
  isWithinRange,
  lastDaysRange,
} from './dates'

const TODAY = new Date(2026, 9, 27) // 2026-10-27, local

describe('default report range', () => {
  it('opens on yesterday → tomorrow so the current day is always visible', () => {
    const range = defaultReportRange(TODAY)

    expect(range).toEqual({ desde: '2026-10-26', hasta: '2026-10-28' })
    expect(DEFAULT_RANGE_BEFORE_DAYS).toBe(1)
    expect(DEFAULT_RANGE_AFTER_DAYS).toBe(1)
  })

  it('keeps today inside the range even when the database clock is off by a day', () => {
    const range = defaultReportRange(TODAY)

    expect(isWithinRange('2026-10-27', range.desde, range.hasta)).toBe(true)
    // A row stamped tomorrow by a database clock that runs ahead.
    expect(isWithinRange('2026-10-28', range.desde, range.hasta)).toBe(true)
    // A row stamped yesterday by a clock that runs behind.
    expect(isWithinRange('2026-10-26', range.desde, range.hasta)).toBe(true)
    // ...both of which the plain "today only" range would have dropped.
    expect(isWithinRange('2026-10-28', '2026-10-27', '2026-10-27')).toBe(false)
  })

  it('still excludes anything outside yesterday and tomorrow', () => {
    const range = defaultReportRange(TODAY)

    expect(isWithinRange('2026-10-25', range.desde, range.hasta)).toBe(false)
    expect(isWithinRange('2026-10-29', range.desde, range.hasta)).toBe(false)
  })

  it('can be widened with a single constant, without touching the layout', () => {
    // Documented alternative: `lastDaysRange` is still available for a 30-day view.
    expect(lastDaysRange(30, TODAY)).toEqual({ desde: '2026-09-28', hasta: '2026-10-27' })
  })
})
