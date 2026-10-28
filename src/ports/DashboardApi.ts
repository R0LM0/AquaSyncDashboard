import type { CascadeLevel, CascadeParents } from '../domain/cascade'
import type {
  AccountDetail,
  CatalogOption,
  Catalogs,
  ChangeRow,
  DailyProgress,
  Filters,
  LiveChange,
  MapLayer,
  MapPoint,
  Page,
  PredioLayerProperties,
  PrediosQuery,
  RouteCoverage,
  RouteRankingRow,
  Session,
  SucursalLayerProperties,
  Summary,
  UgestionLayerProperties,
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
  /**
   * One level of the SIGIL cascade (departamento → … → ruta), for the parents the
   * level needs. Scope-aware: a restricted user only receives its own options.
   */
  cascade(level: CascadeLevel, parents: CascadeParents, signal?: AbortSignal): Promise<CatalogOption[]>
  summary(filters: Filters): Promise<Summary>
  dailyProgress(filters: Filters): Promise<DailyProgress[]>
  userRouteProgress(filters: Filters): Promise<UserRouteProgress[]>
  /** Accounts of one route (filial, zona and ruta are required) and whether each was worked. */
  routeCoverage(filters: Filters, signal?: AbortSignal): Promise<RouteCoverage>
  /** Every route of the unit (ugestión or sucursal is required), worst avance first. */
  routeRanking(filters: Filters, signal?: AbortSignal): Promise<RouteRankingRow[]>
  mapPoints(filters: Filters): Promise<MapPoint[]>
  changes(filters: Filters, page: number, pageSize: number): Promise<Page<ChangeRow>>
  /** Every row matching the filters; the HTTP adapter walks the API pages. */
  allChanges(filters: Filters): Promise<ChangeRow[]>
  /** Cached for the session by the adapter: the geometry rarely changes. */
  layerUgestiones(ugestionId?: string, signal?: AbortSignal): Promise<MapLayer<UgestionLayerProperties>>
  layerSucursales(ugestionId?: string, signal?: AbortSignal): Promise<MapLayer<SucursalLayerProperties>>
  layerPredios(
    query: PrediosQuery,
    signal?: AbortSignal,
  ): Promise<MapLayer<PredioLayerProperties>>
  accountDetail(cuenta: string, signal?: AbortSignal): Promise<AccountDetail>
  /**
   * Live channel of registered changes. Returns the unsubscribe function; the
   * UI never learns whether this is a mock timer or a SignalR hub.
   */
  subscribeChanges(
    onChange: (change: LiveChange) => void,
    onStatus?: (status: LiveStatus) => void,
  ): () => void
}
