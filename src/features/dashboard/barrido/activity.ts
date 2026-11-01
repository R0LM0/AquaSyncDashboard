import type { ActividadDispositivo, ActividadPorDia, BarridoAsignacion, ServicioNuevoRegistro } from '@/domain/types'
import { localDateKey } from '@/shared/dates'
import { trafficLight, type TrafficLight } from '../coverage/ranking/routeRanking'

/**
 * Colors that tell the phones apart on the chart and the map. They stay away from the traffic
 * light green, amber and red, so a device is never read as a progress state.
 */
export const ALIAS_COLORS = [
  '#2563eb',
  '#db2777',
  '#0d9488',
  '#7c3aed',
  '#0891b2',
  '#ea580c',
  '#4d7c0f',
  '#be123c',
] as const

/** The aliases of the screen in a stable order ("Dispositivo A" before "Dispositivo B"). */
export function collectAliases(...sources: Array<ReadonlyArray<{ alias: string } | { dispositivo: string }>>): string[] {
  const seen = new Set<string>()
  for (const source of sources) {
    for (const item of source) {
      const alias = 'alias' in item ? item.alias : item.dispositivo
      if (alias) seen.add(alias)
    }
  }
  return [...seen].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }))
}

/** Same alias, same color, on the chart, the map and the table. */
export function aliasColor(alias: string, order: readonly string[]): string {
  const index = order.indexOf(alias)
  return ALIAS_COLORS[(index < 0 ? order.length : index) % ALIAS_COLORS.length]
}

export type DayRow = { fecha: string } & Record<string, number | string>

export interface StackedDays {
  rows: DayRow[]
  aliases: string[]
}

/** One row per day with a column per alias (zero when it had no activity), oldest day first. */
export function stackByDay(porDia: ActividadPorDia[]): StackedDays {
  const aliases = collectAliases(porDia)
  const days = new Map<string, DayRow>()

  for (const entry of porDia) {
    const row = days.get(entry.fecha) ?? ({ fecha: entry.fecha, ...Object.fromEntries(aliases.map((alias) => [alias, 0])) } as DayRow)
    const alias = entry.dispositivo
    row[alias] = Number(row[alias] ?? 0) + entry.cantidad
    days.set(entry.fecha, row)
  }

  return { rows: [...days.values()].sort((a, b) => a.fecha.localeCompare(b.fecha)), aliases }
}

/** Case-insensitive search over any of the values. An empty query matches everything. */
export function matchesQuery(query: string, ...values: Array<string | number | null | undefined>): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return values.some((value) => value !== null && value !== undefined && String(value).toLowerCase().includes(needle))
}

export function assignmentKeyOf(row: Pick<BarridoAsignacion, 'usrId' | 'cliBarridoId' | 'periodoId'>): string {
  return `${row.usrId}|${row.cliBarridoId}|${row.periodoId}`
}

export function filterAssignments(rows: BarridoAsignacion[], query: string): BarridoAsignacion[] {
  return rows.filter((row) => matchesQuery(query, row.usuario, row.filial, row.zona, row.ruta, row.periodo))
}

/** The ranking traffic light, read over the survey progress of an assignment. */
export function assignmentLight(row: Pick<BarridoAsignacion, 'encuestadas' | 'avance'>): TrafficLight {
  return trafficLight({ trabajadas: row.encuestadas, avancePct: row.avance })
}

export function assignmentTotals(rows: BarridoAsignacion[]) {
  const asignadas = rows.reduce((total, row) => total + row.asignadas, 0)
  const encuestadas = rows.reduce((total, row) => total + row.encuestadas, 0)
  return {
    asignadas,
    encuestadas,
    pendientes: rows.reduce((total, row) => total + row.pendientes, 0),
    avance: asignadas === 0 ? 0 : Math.round((encuestadas / asignadas) * 1000) / 10,
  }
}

/** Largest number of table rows drawn at once; the search narrows the rest. */
export const ROW_LIMIT = 200

export function limitRows<T>(rows: T[], limit = ROW_LIMIT): { shown: T[]; hidden: number } {
  return { shown: rows.slice(0, limit), hidden: Math.max(0, rows.length - limit) }
}

export function hasLocation<T extends { lat: number | null; lng: number | null }>(
  item: T,
): item is T & { lat: number; lng: number } {
  return item.lat !== null && item.lng !== null && Number.isFinite(item.lat) && Number.isFinite(item.lng)
}

export function activityFileName(prefix: string, extension: 'xlsx' | 'pdf', generatedAt: Date): string {
  return `${prefix}-${localDateKey(generatedAt)}.${extension}`
}

export function deviceLabel(device: Pick<ActividadDispositivo, 'alias' | 'modelo'>): string {
  return device.modelo ? `${device.alias} · ${device.modelo}` : device.alias
}

export function filterRegistros(rows: ServicioNuevoRegistro[], query: string): ServicioNuevoRegistro[] {
  return rows.filter((row) =>
    matchesQuery(query, row.id, row.usuario, row.alias, row.modelo, row.estado, row.sucursal, row.cliente),
  )
}
