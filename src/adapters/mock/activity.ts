import type {
  ActividadDispositivo,
  ActividadPorDia,
  BarridoAsignacion,
  BarridoPendiente,
  Filters,
} from '../../domain/types'
import { dateKeyOf, isWithinRange, localDateKey, addDays } from '../../shared/dates'
import { rutaSucursal, type MockDataset } from './data'
import { createRandom, pick, randomInt } from './random'

const ACTIVITY_SEED = 20261101
const ACTIVITY_DAYS = 21

/** The phones of the mock: the first one active gets "Dispositivo A", and so on. */
const DEVICES = [
  { id: 'dev-a1f3', alias: 'Dispositivo A', modelo: 'SM-A135M', appVersion: '1.17.0', usuario: 'encuesta.mga' },
  { id: 'dev-b72c', alias: 'Dispositivo B', modelo: 'moto g23', appVersion: '1.17.0', usuario: 'encuesta.mga' },
  { id: 'dev-c09d', alias: 'Dispositivo C', modelo: 'Redmi Note 12', appVersion: '1.16.2', usuario: 'encuesta.occ' },
  { id: 'dev-d44e', alias: 'Dispositivo D', modelo: 'SM-A055M', appVersion: '1.17.0', usuario: 'encuesta.occ' },
] as const

type Device = (typeof DEVICES)[number]

const ESTADOS_SERVICIO = ['Pendiente', 'En proceso', 'Aprobado', 'Rechazado'] as const
const NOMBRES = ['Ana', 'Luis', 'María', 'José', 'Carmen', 'Pedro', 'Rosa', 'Marvin']
const APELLIDOS = ['Pérez', 'López', 'Gómez', 'Rivas', 'Castro', 'Mejía', 'Ortega', 'Flores']

export interface MockAssignment extends BarridoAsignacion {
  ugestionId: string
  sucursalId: string
}

export interface MockSurvey {
  cuenta: string
  catastro: string
  device: Device
  /** ISO 8601 UTC instant. */
  fecha: string
  lat: number
  lng: number
  assignmentKey: string
  ugestionId: string
  sucursalId: string
}

export interface MockServicio {
  id: string
  fecha: string
  device: Device
  estado: string
  sucursal: string
  cliente: string
  lat: number
  lng: number
  ugestionId: string
  sucursalId: string
}

export interface MockActivity {
  assignments: MockAssignment[]
  surveys: MockSurvey[]
  pending: Map<string, BarridoPendiente[]>
  servicios: MockServicio[]
}

export function assignmentKey(row: Pick<BarridoAsignacion, 'usrId' | 'cliBarridoId' | 'periodoId'>): string {
  return `${row.usrId}|${row.cliBarridoId}|${row.periodoId}`
}

function instant(day: Date, random: () => number): string {
  const at = new Date(day)
  at.setHours(randomInt(random, 7, 16), randomInt(random, 0, 59), randomInt(random, 0, 59), 0)
  return at.toISOString()
}

/** Deterministic Barrido and Servicios nuevos telemetry derived from the mock catalogs. */
export function buildMockActivity(dataset: MockDataset, today: Date): MockActivity {
  const random = createRandom(ACTIVITY_SEED)
  const routes = new Map(dataset.catalogs.rutas.map((ruta) => [ruta.nombre, ruta]))
  const usuarios = dataset.catalogs.usuarios

  const assignments: MockAssignment[] = []
  const surveys: MockSurvey[] = []
  const pending = new Map<string, BarridoPendiente[]>()
  let cliBarridoId = 100

  usuarios.forEach((usuario, index) => {
    const ruta = routes.get(
      dataset.accounts[index % Math.max(dataset.accounts.length, 1)]?.ruta ?? '',
    )
    if (!ruta) return
    const sucursalId = dataset.rutaSucursal[ruta.id] ?? rutaSucursal[ruta.id] ?? ''
    const ugestionId = dataset.sucursalUgestion[sucursalId] ?? ''
    const accounts = dataset.accounts.filter((account) => account.ruta === ruta.nombre)
    if (accounts.length === 0) return

    cliBarridoId += 1
    const base = {
      usrId: String(index + 1),
      usuario: usuario.nombre,
      cliBarridoId: String(cliBarridoId),
      periodoId: '202611',
      periodo: 'Noviembre 2026',
    }
    const key = assignmentKey(base)
    // Every third assignment has not started, so the "Sin iniciar" state is visible.
    const done = index % 3 === 2 ? 0 : Math.floor(accounts.length * (0.25 + random() * 0.65))
    const surveyed = accounts.slice(0, done)

    surveyed.forEach((account) => {
      const device = pick(random, DEVICES)
      surveys.push({
        cuenta: account.cuenta,
        catastro: `${ruta.filial}-${ruta.zona}-${account.cuenta}`,
        device,
        fecha: instant(addDays(today, -randomInt(random, 0, ACTIVITY_DAYS - 1)), random),
        lat: account.lat,
        lng: account.lng,
        assignmentKey: key,
        ugestionId,
        sucursalId,
      })
    })

    pending.set(
      key,
      accounts.slice(done).map((account) => ({
        clienteBarridoId: String(cliBarridoId),
        cuentaNro: account.cuenta,
        catastro: `${ruta.filial}-${ruta.zona}-${account.cuenta}`,
        cliente: account.cliente,
        direccion: `Barrio ${ruta.zona}, casa ${randomInt(random, 1, 90)}`,
        lat: account.lat,
        lng: account.lng,
      })),
    )

    assignments.push({
      ...base,
      filial: ruta.filial,
      zona: ruta.zona,
      ruta: ruta.nombre,
      asignadas: accounts.length,
      encuestadas: done,
      pendientes: accounts.length - done,
      avance: Math.round((done / accounts.length) * 1000) / 10,
      ugestionId,
      sucursalId,
    })
  })

  const sucursales = dataset.catalogs.sucursales
  const servicios: MockServicio[] = []
  for (let index = 0; index < 36; index += 1) {
    const sucursal = pick(random, sucursales)
    const anchor = dataset.accounts[index % Math.max(dataset.accounts.length, 1)]
    servicios.push({
      id: String(9000 + index),
      fecha: instant(addDays(today, -randomInt(random, 0, ACTIVITY_DAYS - 1)), random),
      device: pick(random, DEVICES),
      estado: pick(random, ESTADOS_SERVICIO),
      sucursal: sucursal.nombre,
      cliente: `${pick(random, NOMBRES)} ${pick(random, APELLIDOS)}`,
      lat: (anchor?.lat ?? 12.13) + (random() - 0.5) * 0.02,
      lng: (anchor?.lng ?? -86.25) + (random() - 0.5) * 0.02,
      ugestionId: sucursal.ugestionId,
      sucursalId: sucursal.id,
    })
  }

  return { assignments, surveys, pending, servicios }
}

/** Scope and filter rule shared by the mock reports: unit, sucursal and the day range. */
export function inActivityScope(
  row: { ugestionId: string; sucursalId: string; fecha?: string },
  filters: Filters,
  withRange: boolean,
): boolean {
  if (filters.ugestionId && row.ugestionId !== filters.ugestionId) return false
  if (filters.sucursalId && row.sucursalId !== filters.sucursalId) return false
  if (withRange && row.fecha && !isWithinRange(dateKeyOf(row.fecha), filters.desde, filters.hasta)) return false
  return true
}

interface DeviceRecord {
  device: Device
  fecha: string
  lat: number
  lng: number
}

export function perDay(records: DeviceRecord[]): ActividadPorDia[] {
  const buckets = new Map<string, ActividadPorDia>()
  for (const record of records) {
    const fecha = dateKeyOf(record.fecha)
    const key = `${fecha}|${record.device.alias}`
    const current = buckets.get(key) ?? { fecha, dispositivo: record.device.alias, cantidad: 0 }
    current.cantidad += 1
    buckets.set(key, current)
  }
  return [...buckets.values()].sort(
    (a, b) => a.fecha.localeCompare(b.fecha) || a.dispositivo.localeCompare(b.dispositivo),
  )
}

export function deviceSummary(records: DeviceRecord[]): ActividadDispositivo[] {
  const byDevice = new Map<string, DeviceRecord[]>()
  for (const record of records) {
    const list = byDevice.get(record.device.id) ?? []
    list.push(record)
    byDevice.set(record.device.id, list)
  }

  return [...byDevice.values()]
    .map((list) => {
      const sorted = [...list].sort((a, b) => a.fecha.localeCompare(b.fecha))
      const last = sorted[sorted.length - 1]
      return {
        usuario: last.device.usuario,
        dispositivoId: last.device.id,
        alias: last.device.alias,
        modelo: last.device.modelo,
        appVersion: last.device.appVersion,
        cantidad: list.length,
        primera: sorted[0].fecha,
        ultima: last.fecha,
        lat: last.lat,
        lng: last.lng,
      }
    })
    .sort((a, b) => a.alias.localeCompare(b.alias))
}

export function countToday(records: Array<{ fecha: string }>, today: Date): number {
  const key = localDateKey(today)
  return records.filter((record) => dateKeyOf(record.fecha) === key).length
}
