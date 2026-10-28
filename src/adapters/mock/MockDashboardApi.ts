import { ALCANCE_PAIS } from '../../domain/alcance'
import type { CascadeLevel, CascadeParents } from '../../domain/cascade'
import { ApiError, ForbiddenError, NotFoundError } from '../../domain/errors'
import type {
  Alcance,
  AccountDetail,
  AccountHistoryEntry,
  AccountMeta,
  AccountPhoto,
  CatalogOption,
  ChangeRow,
  DailyProgress,
  Filters,
  MapLayer,
  MapPoint,
  PredioEstado,
  PredioLayerProperties,
  PrediosQuery,
  CoverageAccount,
  RouteCoverage,
  RouteRankingRow,
  SucursalLayerProperties,
  Summary,
  UgestionLayerProperties,
  UserRouteProgress,
} from '../../domain/types'
import type { DashboardApi } from '../../ports/DashboardApi'
import { dateKeyOf, isWithinRange } from '../../shared/dates'
import {
  buildLiveEvent,
  buildMockDataset,
  rutaSucursal,
  type MockDataset,
  type MockEvent,
} from './data'
import { createRandom, randomInt } from './random'
import {
  bboxOfPoints,
  bboxOfRing,
  collectionOf,
  emptyLayer,
  featureFromRing,
  intersects,
  placeholderPhoto,
  PREDIOS_MIN_ZOOM,
  predioRing,
  ringFromBbox,
} from './layers'
import { assertWithinScope, cascadeOptions, enforceScope } from './scope'

/** The restricted user of the mock: Madriz, unidad 4, whole unit (no sucursal list). */
export const DSORIANO_ALCANCE: Alcance = {
  pais: false,
  ugestionId: '4',
  ugestionNombre: 'Unidad de Gestión Madriz',
  dptoId: '4',
  sucursales: [],
  mapa: { lat: 13.48, lng: -86.47, zoom: 11 },
}

/** Static states of the predios that the period did not work (deterministic, by index). */
const STATIC_ESTADOS: readonly PredioEstado[] = ['vinculado', 'sin_ubicacion', 'sin_asociacion']

export interface MockDashboardApiOptions {
  /** Anchor day for the generated history. Defaults to today. */
  today?: Date
  /** Seed for the generated history, so tests can pin the dataset. */
  seed?: number
  /** Tie-break for `Truncated`: the server cuts the lot list at 3000. */
  predioLimit?: number
}

const LIVE_DELAY_MIN_MS = 5_000
const LIVE_DELAY_MAX_MS = 9_500

export class MockDashboardApi implements DashboardApi {
  private dataset: MockDataset
  private readonly meta = new Map<string, AccountMeta>()
  private readonly liveRandom = createRandom(Date.now() % 100_000)
  private listeners = new Set<Parameters<DashboardApi['subscribeChanges']>[0]>()
  private timer: ReturnType<typeof setTimeout> | undefined
  private readonly predioLimit: number
  private readonly ugestionLayers = new Map<string, MapLayer<UgestionLayerProperties>>()
  private readonly sucursalLayers = new Map<string, MapLayer<SucursalLayerProperties>>()
  private readonly predioRings = new Map<string, Array<[number, number]>>()
  /** Scope of the logged-in user: country by default, as the real API. */
  private scope: Alcance = ALCANCE_PAIS

  constructor(options: MockDashboardApiOptions = {}) {
    this.dataset = buildMockDataset(options.today ?? new Date())
    this.predioLimit = options.predioLimit ?? 3000

    const rutas = new Map(
      this.dataset.catalogs.rutas.map((ruta) => [ruta.nombre, ruta]),
    )
    for (const account of this.dataset.accounts) {
      const ruta = rutas.get(account.ruta)
      const sucursalId = ruta ? this.dataset.rutaSucursal[ruta.id] : undefined
      this.meta.set(account.cuenta, {
        cuenta: account.cuenta,
        cliente: account.cliente,
        lat: account.lat,
        lng: account.lng,
        ruta: account.ruta,
        filial: ruta?.filial ?? '',
        zona: ruta?.zona ?? '',
        sucursalId,
        ugestionId: sucursalId ? this.dataset.sucursalUgestion[sucursalId] : undefined,
      })
    }
  }

  async login(usuario: string, password: string) {
    if (!usuario.trim() || !password.trim()) {
      throw new Error('Usuario y contraseña son obligatorios')
    }

    const known = this.dataset.catalogs.usuarios.find((option) => option.id === usuario)
    this.scope = usuario === 'dsoriano' ? DSORIANO_ALCANCE : ALCANCE_PAIS

    return {
      token: `mock-token-${usuario}`,
      usuario,
      nombre: known?.nombre ?? usuario,
      alcance: structuredClone(this.scope),
    }
  }

  async catalogs() {
    const all = structuredClone(this.dataset.catalogs)
    if (this.scope.pais) return all

    // A restricted user only sees the options of its unidad.
    const unidad = this.scope.ugestionId
    const sucursales = all.sucursales.filter((option) => option.ugestionId === unidad)
    const rutas = all.rutas.filter((ruta) => sucursales.some((sucursal) => this.rutaInSucursal(ruta.id, sucursal.id)))
    return {
      ...all,
      ugestiones: all.ugestiones.filter((option) => option.id === unidad),
      sucursales,
      filiales: all.filiales.filter((option) => rutas.some((ruta) => ruta.filial === option.nombre)),
      zonas: all.zonas.filter((option) => rutas.some((ruta) => ruta.zona === option.nombre)),
      rutas,
    }
  }

  /** One level of the SIGIL cascade, scope-aware. */
  async cascade(
    level: CascadeLevel,
    parents: CascadeParents,
    signal?: AbortSignal,
  ): Promise<CatalogOption[]> {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    return cascadeOptions(this.dataset.catalogs, this.scope, level, parents)
  }

  async summary(input: Filters): Promise<Summary> {
    const filters = enforceScope(input, this.scope)
    const events = this.matchingEvents(filters)
    const worked = new Set(events.map((event) => event.cuenta))
    const countType = (tipo: string) =>
      events.filter((event) => event.tipoCambio === tipo).length

    const scopedAccounts = this.dataset.accounts.filter((account) => {
      const meta = this.meta.get(account.cuenta)
      return meta ? matchesScope(meta, filters) : false
    })

    return {
      cuentasTrabajadas: worked.size,
      fotosNuevas: countType('FotoNueva'),
      fotosActualizadas: countType('FotoActualizada'),
      ubicaciones: countType('UbicacionNueva') + countType('UbicacionCorregida'),
      usuariosActivos: new Set(events.map((event) => event.usuario)).size,
      avanceRutaPct: scopedAccounts.length
        ? Math.round((worked.size / scopedAccounts.length) * 100)
        : 0,
    }
  }

  async dailyProgress(input: Filters): Promise<DailyProgress[]> {
    const buckets = new Map<string, DailyProgress>()
    const filters = enforceScope(input, this.scope)

    for (const event of this.matchingEvents(filters)) {
      const fecha = dateKeyOf(event.fecha)
      const key = `${fecha}|${event.usuario}|${event.tipoCambio}`
      const bucket = buckets.get(key)
      if (bucket) {
        bucket.cambios += 1
      } else {
        buckets.set(key, {
          fecha,
          usuario: event.usuario,
          tipoCambio: event.tipoCambio,
          cambios: 1,
        })
      }
    }

    return [...buckets.values()].sort((a, b) => a.fecha.localeCompare(b.fecha))
  }

  async userRouteProgress(input: Filters): Promise<UserRouteProgress[]> {
    const rows = new Map<string, UserRouteProgress & { cuentas: Set<string> }>()
    const filters = enforceScope(input, this.scope)

    for (const event of this.matchingEvents(filters)) {
      const meta = this.meta.get(event.cuenta)
      if (!meta) continue

      const key = `${event.usuario}|${meta.ruta}`
      const current = rows.get(key)
      const row: UserRouteProgress & { cuentas: Set<string> } =
        current ?? {
          usuario: event.usuario,
          filial: meta.filial,
          zona: meta.zona,
          ruta: meta.ruta,
          cuentasRuta: this.countAccounts(meta.ruta),
          cuentasTrabajadas: 0,
          fotos: 0,
          ubicaciones: 0,
          ultimaActividad: event.fecha,
          cuentas: new Set<string>(),
        }

      row.cuentas.add(event.cuenta)
      const isPhoto = event.tipoCambio === 'FotoNueva' || event.tipoCambio === 'FotoActualizada'
      if (isPhoto) row.fotos += 1
      else row.ubicaciones += 1
      if (event.fecha > row.ultimaActividad) row.ultimaActividad = event.fecha
      rows.set(key, row)
    }

    return [...rows.values()]
      .map(({ cuentas, ...row }) => ({ ...row, cuentasTrabajadas: cuentas.size }))
      .sort((a, b) => a.usuario.localeCompare(b.usuario))
  }

  /**
   * Roster of the route (pendiente or trabajada) plus, as fuera de ruta, two accounts of a
   * neighbouring route of the same zona that were worked in the period: the mock has no
   * history table, so "worked with this route, no longer on its roster" is simulated this way.
   */
  async routeCoverage(input: Filters): Promise<RouteCoverage> {
    if (!input.filial || !input.zona || !input.ruta) {
      throw new ApiError('Seleccioná filial, zona y ruta para ver la cobertura', 400, 'Bad Request')
    }

    const filters = enforceScope(input, this.scope)
    const eventsByAccount = groupByAccount(this.matchingEvents(filters))
    const roster = this.dataset.accounts
      .filter((account) => {
        const meta = this.meta.get(account.cuenta)
        return meta !== undefined && matchesScope(meta, filters)
      })
      .map((account) => this.coverageRow(account.cuenta, 'trabajada', eventsByAccount.get(account.cuenta)))

    const neighbours = groupByAccount(
      this.matchingEvents({ ...filters, ruta: undefined }).filter((event) => {
        const meta = this.meta.get(event.cuenta)
        return meta !== undefined && meta.ruta !== input.ruta && meta.zona === input.zona && meta.filial === input.filial
      }),
    )
    const outOfRoster = [...neighbours.keys()]
      .sort(compareCuenta)
      .slice(0, MOCK_FUERA_DE_RUTA)
      .map((cuenta) => this.coverageRow(cuenta, 'fuera_de_ruta', neighbours.get(cuenta)))

    const rows = [...roster, ...outOfRoster].sort(byEstadoThenCuenta)
    const trabajadas = rows.filter((row) => row.estado === 'trabajada').length
    const pendientes = rows.filter((row) => row.estado === 'pendiente').length
    const fueraDeRuta = rows.filter((row) => row.estado === 'fuera_de_ruta').length
    const cuentasRuta = roster.length

    return {
      filial: input.filial,
      zona: input.zona,
      ruta: input.ruta,
      cuentasRuta,
      trabajadas,
      pendientes,
      fueraDeRuta,
      avancePct: cuentasRuta > 0 ? Math.round((trabajadas * 1000) / cuentasRuta) / 10 : 0,
      cuentas: rows,
    }
  }

  /** An account with events is `estado` (worked); one without events is pending. */
  private coverageRow(cuenta: string, estado: CoverageAccount['estado'], events: MockEvent[] | undefined): CoverageAccount {
    const meta = this.meta.get(cuenta)
    const ordered = [...(events ?? [])].sort((a, b) => a.fecha.localeCompare(b.fecha))
    const first = ordered[0]
    const last = ordered[ordered.length - 1]
    const fotos = ordered.filter((event) => event.tipoCambio === 'FotoNueva' || event.tipoCambio === 'FotoActualizada').length

    return {
      cuenta,
      cliente: meta?.cliente ?? '',
      direccion: mockAddress(cuenta),
      numeroCatastral: meta ? `${meta.zona}.${meta.ruta}.${cuenta.slice(-4)}` : '',
      estado: last ? estado : 'pendiente',
      usuario: last?.usuario ?? null,
      primeraActividad: first?.fecha ?? null,
      ultimaActividad: last?.fecha ?? null,
      fotos,
      ubicaciones: ordered.length - fotos,
      lat: meta?.lat ?? null,
      lng: meta?.lng ?? null,
    }
  }

  /**
   * Every route of the unit, roster included: a route with no worked account is listed with
   * zero, so the ranking shows what has not started. Worst avance first, then the route code.
   */
  async routeRanking(input: Filters): Promise<RouteRankingRow[]> {
    const filters = enforceScope(input, this.scope)
    if (!filters.ugestionId && !filters.sucursalId) {
      throw new ApiError('Seleccioná una unidad de gestión o sucursal para ver el ranking de rutas', 400, 'Bad Request')
    }

    const routeOf = (cuenta: string) => {
      const meta = this.meta.get(cuenta)
      return meta ? `${meta.filial}|${meta.zona}|${meta.ruta}` : ''
    }
    const rosterByRoute = new Map<string, Set<string>>()
    for (const account of this.dataset.accounts) {
      const meta = this.meta.get(account.cuenta)
      if (!meta || !matchesScope(meta, filters)) continue
      const key = routeOf(account.cuenta)
      const set = rosterByRoute.get(key) ?? new Set<string>()
      set.add(account.cuenta)
      rosterByRoute.set(key, set)
    }

    const eventsByRoute = new Map<string, MockEvent[]>()
    for (const event of this.matchingEvents(filters)) {
      const key = routeOf(event.cuenta)
      if (!rosterByRoute.has(key)) continue
      const list = eventsByRoute.get(key) ?? []
      list.push(event)
      eventsByRoute.set(key, list)
    }

    const rows: RouteRankingRow[] = [...rosterByRoute.entries()].map(([key, roster]) => {
      const [filial, zona, ruta] = key.split('|')
      const events = eventsByRoute.get(key) ?? []
      const worked = new Set(events.map((event) => event.cuenta))
      const cuentasRuta = roster.size
      const trabajadas = worked.size
      const ultima = events.reduce<string | null>((latest, event) => (latest === null || event.fecha > latest ? event.fecha : latest), null)

      return {
        filial,
        zona,
        ruta,
        cuentasRuta,
        trabajadas,
        pendientes: cuentasRuta - trabajadas,
        avancePct: cuentasRuta > 0 ? Math.round((trabajadas * 1000) / cuentasRuta) / 10 : 0,
        usuarios: new Set(events.map((event) => event.usuario)).size,
        ultimaActividad: ultima,
      }
    })

    return rows.sort(
      (a, b) =>
        a.avancePct - b.avancePct ||
        compareCuenta(a.filial, b.filial) ||
        compareCuenta(a.zona, b.zona) ||
        compareCuenta(a.ruta, b.ruta),
    )
  }

  async mapPoints(input: Filters): Promise<MapPoint[]> {
    const filters = enforceScope(input, this.scope)
    const latest = new Map<string, MockEvent>()
    for (const event of this.matchingEvents(filters)) {
      const current = latest.get(event.cuenta)
      if (!current || event.fecha > current.fecha) latest.set(event.cuenta, event)
    }

    return [...latest.values()].flatMap((event) => {
      const meta = this.meta.get(event.cuenta)
      if (!meta) return []
      return [
        {
          cuenta: meta.cuenta,
          cliente: meta.cliente,
          lat: meta.lat,
          lng: meta.lng,
          tipoCambio: event.tipoCambio,
          usuario: event.usuario,
          fecha: event.fecha,
        },
      ]
    })
  }

  async changes(input: Filters, page: number, pageSize: number) {
    const rows = this.matchingEvents(enforceScope(input, this.scope))
      .map((event) => this.toRow(event))
      .sort((a, b) => b.fecha.localeCompare(a.fecha))

    const safePage = Math.max(1, Math.floor(page))
    const start = (safePage - 1) * pageSize

    return {
      rows: rows.slice(start, start + pageSize),
      total: rows.length,
    }
  }

  async layerUgestiones(
    requested?: string,
    signal?: AbortSignal,
  ): Promise<MapLayer<UgestionLayerProperties>> {
    const ugestionId = this.scopedUgestion(requested)
    const key = ugestionId ?? 'all'
    const cached = this.ugestionLayers.get(key)
    if (cached) return cached

    const random = createRandom(90_001)
    const features = this.dataset.catalogs.ugestiones
      .filter((ugestion) => !ugestionId || ugestion.id === ugestionId)
      .map((ugestion) => {
        const accounts = this.dataset.accounts.filter(
          (account) => this.meta.get(account.cuenta)?.ugestionId === ugestion.id,
        )
        return featureFromRing(ringFromBbox(bboxOfPoints(accounts, 0.05), random), {
          id: Number(ugestion.id),
          nombre: ugestion.nombre,
        })
      })

    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

    const layer: MapLayer<UgestionLayerProperties> = {
      collection: collectionOf(features),
      truncated: false,
    }
    this.ugestionLayers.set(key, layer)
    return layer
  }

  async layerSucursales(
    requested?: string,
    signal?: AbortSignal,
  ): Promise<MapLayer<SucursalLayerProperties>> {
    const ugestionId = this.scopedUgestion(requested)
    const key = ugestionId ?? 'all'
    const cached = this.sucursalLayers.get(key)
    if (cached) return cached

    const random = createRandom(90_002)
    const features = this.dataset.catalogs.sucursales
      .filter((sucursal) => !ugestionId || sucursal.ugestionId === ugestionId)
      .map((sucursal) => {
        const accounts = this.dataset.accounts.filter(
          (account) => this.meta.get(account.cuenta)?.sucursalId === sucursal.id,
        )
        return featureFromRing(ringFromBbox(bboxOfPoints(accounts, 0.03), random, 0.005), {
          id: Number(sucursal.id),
          nombre: sucursal.nombre,
          ugestionId: Number(sucursal.ugestionId),
        })
      })

    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

    const layer: MapLayer<SucursalLayerProperties> = {
      collection: collectionOf(features),
      truncated: false,
    }
    this.sucursalLayers.set(key, layer)
    return layer
  }

  async layerPredios(
    query: PrediosQuery,
    signal?: AbortSignal,
  ): Promise<MapLayer<PredioLayerProperties>> {
    if (query.zoom < PREDIOS_MIN_ZOOM) return emptyLayer('Acerque el mapa para ver predios')

    const ugestionId = this.scopedUgestion(query.ugestionId)
    const worked = this.workedAccounts(query.desde, query.hasta)
    const random = createRandom(90_003)
    const matches = this.dataset.accounts.filter((account) => {
      const meta = this.meta.get(account.cuenta)
      if (!meta) return false
      if (ugestionId && meta.ugestionId !== ugestionId) return false
      if (query.sucursalId && meta.sucursalId !== query.sucursalId) return false

      return intersects(bboxOfRing(this.ringFor(meta.cuenta, meta.lat, meta.lng, random)), query.bbox)
    })

    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

    const truncated = matches.length > this.predioLimit
    const features = matches.slice(0, this.predioLimit).map((account, index) => {
      const meta = this.meta.get(account.cuenta)!
      return featureFromRing(this.ringFor(meta.cuenta, meta.lat, meta.lng, random), {
        id: 90_000 + index,
        idPredio: 555_000 + index,
        nroLote: `${(index % 40) + 1}`,
        idManzana: `${(index % 12) + 1}`,
        idUgestion: Number(meta.ugestionId ?? 0),
        idSucursal: Number(meta.sucursalId ?? 0),
        supTerreno: Number((180 + (index % 30) * 12.5).toFixed(1)),
        supConst: Number((60 + (index % 18) * 8.25).toFixed(1)),
        estado: worked.has(account.cuenta) ? 'trabajado' : STATIC_ESTADOS[index % STATIC_ESTADOS.length],
      })
    })

    return {
      collection: collectionOf(features),
      truncated,
      message: truncated ? 'Mostrando 3000 predios: acerque más' : undefined,
    }
  }

  async accountDetail(cuenta: string, signal?: AbortSignal): Promise<AccountDetail> {
    const meta = this.meta.get(cuenta)
    if (!meta) throw new NotFoundError()
    if (!this.scope.pais && meta.ugestionId !== this.scope.ugestionId) {
      throw new ForbiddenError('No tiene acceso a esa cuenta')
    }

    const events = this.dataset.events
      .filter((event) => event.cuenta === cuenta)
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
      .slice(0, 50)

    const historial: AccountHistoryEntry[] = events.map((event) => ({
      id: event.id,
      fecha: event.fecha,
      usuario: event.usuario,
      tipoCambio: event.tipoCambio,
      origen: event.origen,
    }))

    const fotos: AccountPhoto[] = events
      .filter((event) => event.tipoCambio === 'FotoNueva' || event.tipoCambio === 'FotoActualizada')
      .slice(0, 3)
      .map((event, index) => {
        const tipoNombre = index === 0 ? 'Fachada' : index === 1 ? 'Medidor' : 'Predio'
        return {
          adjuntoId: `9${index}${event.id.slice(-3)}`,
          tipo: 2,
          tipoNombre,
          fecha: event.fecha,
          descripcion: `${tipoNombre} de la cuenta ${cuenta}`,
          urlImagen: placeholderPhoto(`CTA ${cuenta}`, `${tipoNombre} · ${meta.cliente}`, index),
        }
      })

    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

    return {
      cuenta,
      cliente: meta.cliente,
      direccion: `Frente al parque, ${meta.filial} · ${meta.zona}`,
      tipoServicio: '1',
      estado: events.length > 0 ? 'A' : 'S',
      estadoAdministrativo: 'A',
      medidor: `M-${cuenta.slice(-4)}`,
      filial: meta.filial,
      zona: meta.zona,
      ruta: meta.ruta,
      numeroCatastral: `${meta.filial || '00'}.${meta.zona || '00'}.${cuenta.slice(-4)}`,
      ugestionId: meta.ugestionId ?? '',
      ugestionNombre:
        this.dataset.catalogs.ugestiones.find((option) => option.id === meta.ugestionId)?.nombre ??
        '',
      sucursalId: meta.sucursalId ?? '',
      sucursalNombre:
        this.dataset.catalogs.sucursales.find((option) => option.id === meta.sucursalId)?.nombre ??
        '',
      lat: meta.lat,
      lng: meta.lng,
      fotos,
      historial,
    }
  }

  private ringFor(cuenta: string, lat: number, lng: number, random: () => number) {
    const cached = this.predioRings.get(cuenta)
    if (cached) return cached

    const ring = predioRing(lat, lng, random)
    this.predioRings.set(cuenta, ring)
    return ring
  }

  async allChanges(input: Filters): Promise<ChangeRow[]> {
    return this.matchingEvents(enforceScope(input, this.scope))
      .map((event) => this.toRow(event))
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
  }

  subscribeChanges(
    onChange: Parameters<DashboardApi['subscribeChanges']>[0],
    onStatus?: Parameters<DashboardApi['subscribeChanges']>[1],
  ): () => void {
    this.listeners.add(onChange)
    onStatus?.('live')
    this.scheduleLiveEvent()

    return () => {
      this.listeners.delete(onChange)
      if (this.listeners.size === 0) this.stopLiveEvents()
    }
  }

  private scheduleLiveEvent() {
    if (this.timer !== undefined || this.listeners.size === 0) return

    this.timer = setTimeout(() => {
      this.timer = undefined
      const event = buildLiveEvent(this.dataset, this.liveRandom)
      this.dataset.events.push(event)

      const meta = this.meta.get(event.cuenta)
      const change: ChangeRow & { lat?: number; lng?: number } = {
        ...this.toRow(event),
        lat: meta?.lat,
        lng: meta?.lng,
      }
      // A restricted user is only pushed the changes of its unidad, as the server hub does.
      const visible = this.scope.pais || meta?.ugestionId === this.scope.ugestionId
      if (visible) for (const listener of [...this.listeners]) listener(change)

      this.scheduleLiveEvent()
    }, randomInt(this.liveRandom, LIVE_DELAY_MIN_MS, LIVE_DELAY_MAX_MS))
  }

  private stopLiveEvents() {
    if (this.timer !== undefined) {
      clearTimeout(this.timer)
      this.timer = undefined
    }
  }

  /** A layer the user asks for is either its own unidad, or the whole country for admins. */
  private scopedUgestion(requested?: string): string | undefined {
    assertWithinScope({ ugestionId: requested }, this.scope)
    return this.scope.pais ? requested : this.scope.ugestionId
  }

  private rutaInSucursal(rutaId: string, sucursalId: string): boolean {
    return rutaSucursal[rutaId] === sucursalId
  }

  /** Accounts with a change in the period: their predio is "trabajado". */
  private workedAccounts(desde?: string, hasta?: string): Set<string> {
    const period = { desde: desde ?? '0001-01-01', hasta: hasta ?? '9999-12-31' }
    return new Set(this.matchingEvents({ ...period }).map((event) => event.cuenta))
  }

  private countAccounts(ruta: string): number {
    return this.dataset.accounts.filter((account) => account.ruta === ruta).length
  }

  private toRow(event: MockEvent): ChangeRow {
    const meta = this.meta.get(event.cuenta)

    return {
      id: event.id,
      fecha: event.fecha,
      usuario: event.usuario,
      cuenta: event.cuenta,
      cliente: meta?.cliente ?? '',
      filial: meta?.filial ?? '',
      zona: meta?.zona ?? '',
      ruta: meta?.ruta ?? '',
      tipoCambio: event.tipoCambio,
      origen: event.origen,
    }
  }

  private matchingEvents(filters: Filters): MockEvent[] {
    return this.dataset.events.filter((event) => {
      const meta = this.meta.get(event.cuenta)
      if (!meta) return false
      if (!matchesScope(meta, filters)) return false
      if (filters.usuario && event.usuario !== filters.usuario) return false
      if (filters.tipoCambio && event.tipoCambio !== filters.tipoCambio) return false
      return isWithinRange(dateKeyOf(event.fecha), filters.desde, filters.hasta)
    })
  }
}

const MOCK_FUERA_DE_RUTA = 2

const ESTADO_ORDER: Record<CoverageAccount['estado'], number> = {
  pendiente: 0,
  trabajada: 1,
  fuera_de_ruta: 2,
}

function groupByAccount(events: MockEvent[]): Map<string, MockEvent[]> {
  const grouped = new Map<string, MockEvent[]>()
  for (const event of events) {
    const list = grouped.get(event.cuenta) ?? []
    list.push(event)
    grouped.set(event.cuenta, list)
  }
  return grouped
}

function compareCuenta(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true })
}

function byEstadoThenCuenta(a: CoverageAccount, b: CoverageAccount): number {
  return ESTADO_ORDER[a.estado] - ESTADO_ORDER[b.estado] || compareCuenta(a.cuenta, b.cuenta)
}

/** The mock accounts have no street address: a stable one per account keeps the views honest. */
function mockAddress(cuenta: string): string {
  return `Sector ${(Number(cuenta) % 40) + 1}, casa ${cuenta.slice(-3)}`
}

function matchesScope(meta: AccountMeta, filters: Filters): boolean {
  if (filters.ugestionId && meta.ugestionId !== filters.ugestionId) return false
  if (filters.sucursalId && meta.sucursalId !== filters.sucursalId) return false
  if (filters.filial && meta.filial !== filters.filial) return false
  if (filters.zona && meta.zona !== filters.zona) return false
  if (filters.ruta && meta.ruta !== filters.ruta) return false
  return true
}
