import { mapPredioProperties } from './predioProperties'
import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
  type HubConnection,
} from '@microsoft/signalr'
import { dashboardHubUrl } from '../../app/apiUrl'
import type { CascadeLevel, CascadeParents } from '../../domain/cascade'
import { ApiError, ForbiddenError, NotFoundError, SessionExpiredError } from '../../domain/errors'
import type {
  AccountDetail,
  BBox,
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
} from '../../domain/types'
import type { DashboardApi, LiveStatus } from '../../ports/DashboardApi'
import {
  mapAccountDetail,
  mapCascadeOptions,
  mapCatalogs,
  mapChangesPage,
  mapDailyProgress,
  mapLayer,
  mapLiveChange,
  mapMapPoint,
  mapRouteCoverage,
  mapRouteRanking,
  mapSession,
  mapSummary,
  mapUserRouteProgress,
  type AccountDetailDto,
  type CascadeOptionDto,
  type CatalogsDto,
  type CoberturaRutaDto,
  type CoberturaRutaResumenDto,
  type ChangesPageDto,
  type DailyProgressDto,
  type LayerDto,
  type LiveChangeDto,
  type LoginDto,
  type MapPointDto,
  type PredioLayerPropertiesDto,
  type SucursalLayerPropertiesDto,
  type SummaryDto,
  type UgestionLayerPropertiesDto,
  type UserRouteProgressDto,
} from './dto'
import { readEnvelopeParts, toQueryParams, unwrapData } from './envelope'

/** Page size the API accepts for `cambios` (1..200). */
export const MAX_PAGE_SIZE = 200

/**
 * Cascade endpoints and the parents each one takes, in the order of the query.
 * Each level takes every parent of the levels above it.
 */
const CHAIN: Array<keyof CascadeParents> = ['dptoId', 'ugestionId', 'ciudadId', 'sucursalId']
const CASCADE_ENDPOINTS: Record<CascadeLevel, { path: string; params: Array<keyof CascadeParents> }> = {
  departamento: { path: 'departamentos', params: [] },
  ugestion: { path: 'unidades-gestion', params: ['dptoId'] },
  ciudad: { path: 'ciudades', params: ['ugestionId'] },
  sucursal: { path: 'sucursales', params: ['ciudadId'] },
  filial: { path: 'filiales', params: CHAIN },
  zona: { path: 'zonas', params: [...CHAIN, 'filial'] },
  ruta: { path: 'rutas', params: [...CHAIN, 'filial', 'zona'] },
}

interface Envelope<T> {
  data: T
  message: string
}

/**
 * Real adapter for the BarridoServicios API (see Docuemntacion/api-dashboard.md).
 * PascalCase in, camelCase out: nothing above this file knows the wire format.
 */
export class HttpDashboardApi implements DashboardApi {
  private token: string
  private connection: HubConnection | undefined
  private readonly baseUrl: string
  private readonly layerCache = new Map<string, MapLayer<unknown>>()

  constructor(baseUrl: string, token = '') {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
    this.token = token
  }

  async login(usuario: string, password: string): Promise<Session> {
    const { data } = await this.requestEnvelope<LoginDto>(
      'api/Dashboard/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Usuario: usuario, Password: password }),
      },
      'login',
    )

    const session = mapSession(data)
    this.token = session.token
    return session
  }

  async catalogs(): Promise<Catalogs> {
    return mapCatalogs(await this.get<CatalogsDto>('api/Dashboard/catalogos'))
  }

  async cascade(
    level: CascadeLevel,
    parents: CascadeParents,
    signal?: AbortSignal,
  ): Promise<CatalogOption[]> {
    const endpoint = CASCADE_ENDPOINTS[level]
    const params = new URLSearchParams()
    for (const key of endpoint.params) {
      params.set(key, parents[key] ?? '')
    }

    const query = params.toString()
    const { data } = await this.requestEnvelope<CascadeOptionDto[]>(
      `api/Dashboard/catalogos/${endpoint.path}${query ? `?${query}` : ''}`,
      { method: 'GET', signal },
      'authorized',
    )

    return mapCascadeOptions(level, data ?? [])
  }

  async summary(filters: Filters): Promise<Summary> {
    return mapSummary(await this.get<SummaryDto>('api/Dashboard/resumen', filters))
  }

  async dailyProgress(filters: Filters): Promise<DailyProgress[]> {
    return mapDailyProgress(await this.get<DailyProgressDto[]>('api/Dashboard/avance-diario', filters))
  }

  async userRouteProgress(filters: Filters): Promise<UserRouteProgress[]> {
    return mapUserRouteProgress(
      await this.get<UserRouteProgressDto[]>('api/Dashboard/avance-usuario-ruta', filters),
    )
  }

  async routeCoverage(filters: Filters, signal?: AbortSignal): Promise<RouteCoverage> {
    const { data } = await this.requestEnvelope<CoberturaRutaDto>(
      `api/dashboard/cobertura-ruta${toQueryParams(filters)}`,
      { method: 'GET', signal },
      'authorized',
    )

    return mapRouteCoverage(data)
  }

  async routeRanking(filters: Filters, signal?: AbortSignal): Promise<RouteRankingRow[]> {
    const { data } = await this.requestEnvelope<CoberturaRutaResumenDto[]>(
      `api/dashboard/cobertura-rutas${toQueryParams(filters)}`,
      { method: 'GET', signal },
      'authorized',
    )

    return mapRouteRanking(data ?? [])
  }

  async mapPoints(filters: Filters): Promise<MapPoint[]> {
    return (await this.get<MapPointDto[]>('api/Dashboard/mapa', filters)).map(mapMapPoint)
  }

  async changes(filters: Filters, page: number, pageSize: number): Promise<Page<ChangeRow>> {
    const size = Math.min(Math.max(1, Math.floor(pageSize)), MAX_PAGE_SIZE)
    const query = toQueryParams(filters)
    const separator = query ? '&' : '?'
    const dto = await this.get<ChangesPageDto>(
      `api/Dashboard/cambios${query}${separator}pagina=${Math.max(1, Math.floor(page))}&tamano=${size}`,
    )

    return mapChangesPage(dto)
  }

  /** Every change matching the filters, page by page (the API caps pages at 200). */
  async allChanges(filters: Filters): Promise<ChangeRow[]> {
    const rows: ChangeRow[] = []
    let page = 1
    let total = Number.POSITIVE_INFINITY

    while (rows.length < total) {
      const current = await this.changes(filters, page, MAX_PAGE_SIZE)
      total = current.total
      if (current.rows.length === 0) break
      rows.push(...current.rows)
      page += 1
    }

    return rows
  }

  async layerUgestiones(
    ugestionId?: string,
    signal?: AbortSignal,
  ): Promise<MapLayer<UgestionLayerProperties>> {
    return this.cachedLayer(`ugestiones:${ugestionId ?? 'all'}`, signal, async () => {
      const query = ugestionId ? `?ugestionId=${encodeURIComponent(ugestionId)}` : ''
      const { data } = await this.requestEnvelope<LayerDto<UgestionLayerPropertiesDto>>(
        `api/Dashboard/capas/ugestiones${query}`,
        { method: 'GET', signal },
        'authorized',
      )

      return mapLayer(data, (raw) => ({ id: raw.id, nombre: raw.nombre }))
    })
  }

  async layerSucursales(
    ugestionId?: string,
    signal?: AbortSignal,
  ): Promise<MapLayer<SucursalLayerProperties>> {
    return this.cachedLayer(`sucursales:${ugestionId ?? 'all'}`, signal, async () => {
      const query = ugestionId ? `?ugestionId=${encodeURIComponent(ugestionId)}` : ''
      const { data } = await this.requestEnvelope<LayerDto<SucursalLayerPropertiesDto>>(
        `api/Dashboard/capas/sucursales${query}`,
        { method: 'GET', signal },
        'authorized',
      )

      return mapLayer(data, (raw) => ({
        id: raw.id,
        nombre: raw.nombre,
        ugestionId: raw.ugestionId,
      }))
    })
  }

  async layerPredios(
    query: PrediosQuery,
    signal?: AbortSignal,
  ): Promise<MapLayer<PredioLayerProperties>> {
    const params = new URLSearchParams({
      bbox: formatBbox(query.bbox),
      zoom: String(Math.round(query.zoom)),
    })
    if (query.ugestionId) params.set('ugestionId', query.ugestionId)
    if (query.sucursalId) params.set('sucursalId', query.sucursalId)
    if (query.desde) params.set('desde', query.desde)
    if (query.hasta) params.set('hasta', query.hasta)

    const { data, message } = await this.requestEnvelope<LayerDto<PredioLayerPropertiesDto>>(
      `api/Dashboard/capas/predios?${params.toString()}`,
      { method: 'GET', signal },
      'authorized',
    )

    const layer = mapLayer(data, mapPredioProperties)

    return { ...layer, message: message || layer.message }
  }

  async accountDetail(cuenta: string, signal?: AbortSignal): Promise<AccountDetail> {
    const { data } = await this.requestEnvelope<AccountDetailDto>(
      `api/Dashboard/cuenta/${encodeURIComponent(cuenta)}`,
      { method: 'GET', signal },
      'authorized',
    )

    return mapAccountDetail(data)
  }

  subscribeChanges(
    onChange: (change: LiveChange) => void,
    onStatus?: (status: LiveStatus) => void,
  ): () => void {
    if (!this.connection) {
      this.connection = new HubConnectionBuilder()
        .withUrl(dashboardHubUrl(this.baseUrl), {
          accessTokenFactory: () => this.token,
        })
        .withAutomaticReconnect()
        .configureLogging(LogLevel.Warning)
        .build()

      this.connection.on('CambioRegistrado', (payload: LiveChangeDto) =>
        onChange(mapLiveChange(payload)),
      )
      this.connection.onreconnecting(() => onStatus?.('reconnecting'))
      this.connection.onreconnected(() => onStatus?.('live'))
      this.connection.onclose(() => onStatus?.('offline'))
    }

    const connection = this.connection
    if (connection.state === HubConnectionState.Disconnected) {
      void connection
        .start()
        .then(() => onStatus?.('live'))
        .catch(() => onStatus?.('offline'))
    } else {
      onStatus?.('live')
    }

    return () => {
      this.connection = undefined
      void connection.stop()
    }
  }

  /** The geometry of a layer is cached for the session, keyed by its filters. */
  private async cachedLayer<T extends MapLayer<unknown>>(
    key: string,
    signal: AbortSignal | undefined,
    load: () => Promise<T>,
  ): Promise<T> {
    const cached = this.layerCache.get(key)
    if (cached) return cached as T

    const layer = await load()
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    this.layerCache.set(key, layer)
    return layer
  }

  private get<T>(path: string, filters?: Filters): Promise<T> {
    return this.request<T>(
      `${path}${filters ? toQueryParams(filters) : ''}`,
      { method: 'GET' },
      'authorized',
    )
  }

  private async request<T>(
    path: string,
    init: RequestInit,
    mode: 'login' | 'authorized',
  ): Promise<T> {
    const { data } = await this.requestEnvelope<T>(path, init, mode)
    return data
  }

  private async requestEnvelope<T>(
    path: string,
    init: RequestInit,
    mode: 'login' | 'authorized',
  ): Promise<Envelope<T>> {
    const headers = new Headers(init.headers)
    if (mode === 'authorized' && this.token) {
      headers.set('Authorization', `Bearer ${this.token}`)
    }

    const response = await fetch(`${this.baseUrl}${path}`, { ...init, headers })
    const payload: unknown = await response.json().catch(() => undefined)

    if (!response.ok) throw toApiError(response.status, payload, mode)

    return { data: unwrapData<T>(payload), message: readEnvelopeParts(payload).message }
  }
}

export function formatBbox(bbox: BBox): string {
  return [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat]
    .map((value) => value.toFixed(6))
    .join(',')
}

function toApiError(status: number, payload: unknown, mode: 'login' | 'authorized'): ApiError {
  const { title, message } = readEnvelopeParts(payload)

  if (status === 503) return new ApiError('Servicio no disponible', status, title)

  if (status === 401 && mode === 'login') {
    return new ApiError('Usuario o contraseña incorrectos', status, title)
  }

  // 401 is an expired session. 403 is a request outside the user's scope: the session is still good.
  if (status === 401 && mode === 'authorized') return new SessionExpiredError()
  if (status === 403 && mode === 'authorized') return new ForbiddenError()

  if (status === 404) return new NotFoundError(message || title || 'Cuenta no encontrada')

  // A 400 carries Title "Bad Request" and the useful reason in Message; keep
  // Title as the fallback for the envelopes that only send it.
  return new ApiError(message || title || `La API respondió ${status}`, status, title)
}
