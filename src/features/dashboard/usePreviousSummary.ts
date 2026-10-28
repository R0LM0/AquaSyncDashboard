import { useEffect, useMemo, useState } from 'react'
import type { DashboardApi } from '@/ports/DashboardApi'
import type { Filters, Summary } from '@/domain/types'
import { isSessionExpired } from '@/domain/errors'
import { previousPeriod } from './deltas'

/** Summary of the same-length period right before the active one, for deltas. */
export function usePreviousSummary(
  api: DashboardApi,
  filters: Filters,
  refreshToken: number,
  onSessionExpired?: () => void,
): Summary | undefined {
  const [summary, setSummary] = useState<Summary | undefined>(undefined)
  const key = JSON.stringify(previousPeriod(filters))

  useEffect(() => {
    let cancelled = false
    const range: Filters = JSON.parse(key)

    api
      .summary(range)
      .then((result) => {
        if (!cancelled) setSummary(result)
      })
      .catch((error: unknown) => {
        if (isSessionExpired(error)) onSessionExpired?.()
      })

    return () => {
      cancelled = true
    }
  }, [api, key, refreshToken, onSessionExpired])

  return summary
}

/** Kept for symmetry with the other hooks: previous period as a plain range. */
export function usePreviousRange(filters: Filters) {
  return useMemo(() => previousPeriod(filters), [filters])
}
