import { useEffect, useState } from 'react'
import { errorMessage, isSessionExpired } from '@/domain/errors'
import type { Filters, RouteCoverage } from '@/domain/types'
import type { DashboardApi } from '@/ports/DashboardApi'

/** The route the coverage is about. Lives in component state, never in the URL. */
export interface RouteRef {
  filial: string
  zona: string
  ruta: string
}

export type CoverageStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface RouteCoverageState {
  status: CoverageStatus
  data?: RouteCoverage
  error?: string
}

/** The report filters, narrowed to the route. Period and user come from the dashboard filters. */
export function coverageFilters(filters: Filters, route: RouteRef): Filters {
  return { ...filters, filial: route.filial, zona: route.zona, ruta: route.ruta }
}

interface Settled {
  key: string
  status: 'ready' | 'error'
  data?: RouteCoverage
  error?: string
}

/**
 * Loads the coverage of one route. A 401 means the session is gone: the caller closes it.
 * A request for another route aborts the one in flight, so a late answer never wins.
 */
export function useRouteCoverage(
  api: DashboardApi,
  filters: Filters,
  route: RouteRef | null,
  onSessionExpired?: () => void,
): RouteCoverageState {
  const key = route ? JSON.stringify(coverageFilters(filters, route)) : null
  const [settled, setSettled] = useState<Settled | null>(null)

  useEffect(() => {
    if (key === null) return

    const controller = new AbortController()
    const current: Filters = JSON.parse(key)

    api.routeCoverage(current, controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setSettled({ key, status: 'ready', data })
      },
      (error: unknown) => {
        if (controller.signal.aborted) return
        if (isSessionExpired(error)) {
          onSessionExpired?.()
          return
        }
        setSettled({ key, status: 'error', error: errorMessage(error, 'No se pudo cargar la cobertura') })
      },
    )

    return () => controller.abort()
  }, [api, key, onSessionExpired])

  // A result for another route is never shown: until this key settles, the view is loading.
  if (key === null) return { status: 'idle' }
  if (!settled || settled.key !== key) return { status: 'loading' }
  return { status: settled.status, data: settled.data, error: settled.error }
}
