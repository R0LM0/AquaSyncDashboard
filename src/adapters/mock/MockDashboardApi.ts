import type {
  AccountMeta,
  ChangeRow,
  DailyProgress,
  Filters,
  MapPoint,
  Summary,
  UserRouteProgress,
} from '../../domain/types'
import type { DashboardApi } from '../../ports/DashboardApi'
import { dateKeyOf, isWithinRange } from '../../shared/dates'
import {
  buildLiveEvent,
  buildMockDataset,
  type MockDataset,
  type MockEvent,
} from './data'
import { createRandom, randomInt } from './random'

export interface MockDashboardApiOptions {
  /** Anchor day for the generated history. Defaults to today. */
  today?: Date
  /** Seed for the generated history, so tests can pin the dataset. */
  seed?: number
}

const LIVE_DELAY_MIN_MS = 5_000
const LIVE_DELAY_MAX_MS = 9_500

export class MockDashboardApi implements DashboardApi {
  private dataset: MockDataset
  private readonly meta = new Map<string, AccountMeta>()
  private readonly liveRandom = createRandom(Date.now() % 100_000)
  private listeners = new Set<Parameters<DashboardApi['subscribeChanges']>[0]>()
  private timer: ReturnType<typeof setTimeout> | undefined

  constructor(options: MockDashboardApiOptions = {}) {
    this.dataset = buildMockDataset(options.today ?? new Date())

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

    return {
      token: `mock-token-${usuario}`,
      usuario,
      nombre: known?.nombre ?? usuario,
    }
  }

  async catalogs() {
    return structuredClone(this.dataset.catalogs)
  }

  async summary(filters: Filters): Promise<Summary> {
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

  async dailyProgress(filters: Filters): Promise<DailyProgress[]> {
    const buckets = new Map<string, DailyProgress>()

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

  async userRouteProgress(filters: Filters): Promise<UserRouteProgress[]> {
    const rows = new Map<string, UserRouteProgress & { cuentas: Set<string> }>()

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

  async mapPoints(filters: Filters): Promise<MapPoint[]> {
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

  async changes(filters: Filters, page: number, pageSize: number) {
    const rows = this.matchingEvents(filters)
      .map((event) => this.toRow(event))
      .sort((a, b) => b.fecha.localeCompare(a.fecha))

    const safePage = Math.max(1, Math.floor(page))
    const start = (safePage - 1) * pageSize

    return {
      rows: rows.slice(start, start + pageSize),
      total: rows.length,
    }
  }

  async allChanges(filters: Filters): Promise<ChangeRow[]> {
    return this.matchingEvents(filters)
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
      for (const listener of [...this.listeners]) listener(change)

      this.scheduleLiveEvent()
    }, randomInt(this.liveRandom, LIVE_DELAY_MIN_MS, LIVE_DELAY_MAX_MS))
  }

  private stopLiveEvents() {
    if (this.timer !== undefined) {
      clearTimeout(this.timer)
      this.timer = undefined
    }
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

function matchesScope(meta: AccountMeta, filters: Filters): boolean {
  if (filters.ugestionId && meta.ugestionId !== filters.ugestionId) return false
  if (filters.sucursalId && meta.sucursalId !== filters.sucursalId) return false
  if (filters.filial && meta.filial !== filters.filial) return false
  if (filters.zona && meta.zona !== filters.zona) return false
  if (filters.ruta && meta.ruta !== filters.ruta) return false
  return true
}
