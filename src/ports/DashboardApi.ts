import type {
  Catalogs,
  ChangeRow,
  DailyProgress,
  Filters,
  LiveChange,
  MapPoint,
  Page,
  Session,
  Summary,
  UserRouteProgress,
} from '../domain/types'

export type LiveStatus = 'live' | 'reconnecting' | 'offline'

/**
 * The dashboard contract. The UI depends only on this port; the mock adapter is
 * used today and the HTTP adapter replaces it once the backend exists.
 */
export interface DashboardApi {
  login(usuario: string, password: string): Promise<Session>
  catalogs(): Promise<Catalogs>
  summary(filters: Filters): Promise<Summary>
  dailyProgress(filters: Filters): Promise<DailyProgress[]>
  userRouteProgress(filters: Filters): Promise<UserRouteProgress[]>
  mapPoints(filters: Filters): Promise<MapPoint[]>
  changes(filters: Filters, page: number, pageSize: number): Promise<Page<ChangeRow>>
  /** Every row matching the filters; the HTTP adapter walks the API pages. */
  allChanges(filters: Filters): Promise<ChangeRow[]>
  /**
   * Live channel of registered changes. Returns the unsubscribe function; the
   * UI never learns whether this is a mock timer or a SignalR hub.
   */
  subscribeChanges(
    onChange: (change: LiveChange) => void,
    onStatus?: (status: LiveStatus) => void,
  ): () => void
}
