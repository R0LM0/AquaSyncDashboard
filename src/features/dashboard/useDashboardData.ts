import { useCallback, useEffect, useState } from 'react'
import type {
  Catalogs,
  ChangeRow,
  DailyProgress,
  Filters,
  MapPoint,
  Page,
  Summary,
  UserRouteProgress,
} from '../../domain/types'
import { isSessionExpired } from '../../domain/errors'
import type { DashboardApi } from '../../ports/DashboardApi'

export interface DashboardData {
  catalogs: Catalogs
  summary: Summary
  daily: DailyProgress[]
  progress: UserRouteProgress[]
  points: MapPoint[]
}

export type LoadStatus = 'loading' | 'ready' | 'error'

interface DashboardState {
  status: LoadStatus
  data?: DashboardData
  error?: string
  /** When the authoritative numbers arrived, for deriving the live delta. */
  loadedAt: number
}

/**
 * Loads every non paginated view for the active filters. A 401/403 outside login
 * means the session is gone: the caller closes it instead of showing an error.
 */
export function useDashboardData(
  api: DashboardApi,
  filters: Filters,
  refreshToken: number,
  onSessionExpired?: () => void,
) {
  const [state, setState] = useState<DashboardState>({ status: 'loading', loadedAt: 0 })
  const filtersKey = JSON.stringify(filters)

  useEffect(() => {
    let cancelled = false
    const current: Filters = JSON.parse(filtersKey)

    async function load() {
      try {
        const [catalogs, summary, daily, progress, points] = await Promise.all([
          api.catalogs(),
          api.summary(current),
          api.dailyProgress(current),
          api.userRouteProgress(current),
          api.mapPoints(current),
        ])
        if (!cancelled) {
          setState({
            status: 'ready',
            loadedAt: Date.now(),
            data: { catalogs, summary, daily, progress, points },
          })
        }
      } catch (error) {
        if (cancelled) return
        if (isSessionExpired(error)) {
          onSessionExpired?.()
          return
        }
        setState((previous) => ({
          status: 'error',
          data: previous.data,
          loadedAt: previous.loadedAt,
          error: error instanceof Error ? error.message : 'No se pudo cargar la información',
        }))
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [api, filtersKey, refreshToken, onSessionExpired])

  return state
}

interface ChangesState {
  status: LoadStatus
  page?: Page<ChangeRow>
  error?: string
}

export function useChangesPage(
  api: DashboardApi,
  filters: Filters,
  page: number,
  pageSize: number,
  refreshToken: number,
  onSessionExpired?: () => void,
) {
  const [state, setState] = useState<ChangesState>({ status: 'loading' })
  const filtersKey = JSON.stringify(filters)

  useEffect(() => {
    let cancelled = false
    const current: Filters = JSON.parse(filtersKey)

    async function load() {
      try {
        const result = await api.changes(current, page, pageSize)
        if (!cancelled) setState({ status: 'ready', page: result })
      } catch (error) {
        if (cancelled) return
        if (isSessionExpired(error)) {
          onSessionExpired?.()
          return
        }
        setState({
          status: 'error',
          error: error instanceof Error ? error.message : 'No se pudo cargar el detalle',
        })
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [api, filtersKey, page, pageSize, refreshToken, onSessionExpired])

  return state
}

/** Manual reload bump, also used after a live change. */
export function useRefreshToken(): [number, () => void] {
  const [token, setToken] = useState(0)
  const bump = useCallback(() => setToken((current) => current + 1), [])
  return [token, bump]
}
