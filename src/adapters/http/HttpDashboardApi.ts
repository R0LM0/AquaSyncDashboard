import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
  type HubConnection,
} from '@microsoft/signalr'
import { dashboardHubUrl } from '../../app/apiUrl'
import { ApiError, SessionExpiredError } from '../../domain/errors'
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
} from '../../domain/types'
import type { DashboardApi, LiveStatus } from '../../ports/DashboardApi'
import {
  mapCatalogs,
  mapChangesPage,
  mapDailyProgress,
  mapLiveChange,
  mapMapPoint,
  mapSession,
  mapSummary,
  mapUserRouteProgress,
  type CatalogsDto,
  type ChangesPageDto,
  type DailyProgressDto,
  type LiveChangeDto,
  type LoginDto,
  type MapPointDto,
  type SummaryDto,
  type UserRouteProgressDto,
} from './dto'
import { readEnvelopeParts, toQueryParams, unwrapData } from './envelope'

/** Page size the API accepts for `cambios` (1..200). */
export const MAX_PAGE_SIZE = 200

/**
 * Real adapter for the BarridoServicios API (see Docuemntacion/api-dashboard.md).
 * PascalCase in, camelCase out: nothing above this file knows the wire format.
 */
export class HttpDashboardApi implements DashboardApi {
  private token: string
  private connection: HubConnection | undefined
  private readonly baseUrl: string

  constructor(baseUrl: string, token = '') {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
    this.token = token
  }

  async login(usuario: string, password: string): Promise<Session> {
    const dto = await this.request<LoginDto>(
      'api/Dashboard/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Usuario: usuario, Password: password }),
      },
      'login',
    )

    const session = mapSession(dto)
    this.token = session.token
    return session
  }

  async catalogs(): Promise<Catalogs> {
    return mapCatalogs(await this.get<CatalogsDto>('api/Dashboard/catalogos'))
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
    const headers = new Headers(init.headers)
    if (mode === 'authorized' && this.token) {
      headers.set('Authorization', `Bearer ${this.token}`)
    }

    const response = await fetch(`${this.baseUrl}${path}`, { ...init, headers })
    const payload: unknown = await response.json().catch(() => undefined)

    if (!response.ok) throw toApiError(response.status, payload, mode)

    return unwrapData<T>(payload)
  }
}

function toApiError(
  status: number,
  payload: unknown,
  mode: 'login' | 'authorized',
): ApiError {
  const { title, message } = readEnvelopeParts(payload)

  if (status === 503) return new ApiError('Servicio no disponible', status, title)

  if (status === 401 && mode === 'login') {
    return new ApiError('Usuario o contraseña incorrectos', status, title)
  }

  if ((status === 401 || status === 403) && mode === 'authorized') {
    return new SessionExpiredError()
  }

  // A 400 carries the reason in Title (invalid filters, blank credentials, pagination).
  return new ApiError(title || message || `La API respondió ${status}`, status, title)
}
