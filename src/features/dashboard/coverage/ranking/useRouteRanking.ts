import { useEffect, useState } from 'react'
import { errorMessage, isSessionExpired } from '@/domain/errors'
import type { Filters, RouteRankingRow } from '@/domain/types'
import type { DashboardApi } from '@/ports/DashboardApi'

export type RankingStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface RouteRankingState {
  status: RankingStatus
  rows?: RouteRankingRow[]
  error?: string
}

interface Settled {
  key: string
  status: 'ready' | 'error'
  rows?: RouteRankingRow[]
  error?: string
}

/**
 * Loads the ranking of every route of the unit. Only runs when the filters name a unidad or a
 * sucursal (`enabled`); a 401 closes the session, a new request aborts the one in flight.
 */
export function useRouteRanking(
  api: DashboardApi,
  filters: Filters,
  enabled: boolean,
  onSessionExpired?: () => void,
): RouteRankingState {
  const key = enabled ? JSON.stringify(filters) : null
  const [settled, setSettled] = useState<Settled | null>(null)

  useEffect(() => {
    if (key === null) return

    const controller = new AbortController()
    const current: Filters = JSON.parse(key)

    api.routeRanking(current, controller.signal).then(
      (rows) => {
        if (!controller.signal.aborted) setSettled({ key, status: 'ready', rows })
      },
      (error: unknown) => {
        if (controller.signal.aborted) return
        if (isSessionExpired(error)) {
          onSessionExpired?.()
          return
        }
        setSettled({ key, status: 'error', error: errorMessage(error, 'No se pudo cargar el ranking de rutas') })
      },
    )

    return () => controller.abort()
  }, [api, key, onSessionExpired])

  if (key === null) return { status: 'idle' }
  if (!settled || settled.key !== key) return { status: 'loading' }
  return { status: settled.status, rows: settled.rows, error: settled.error }
}
