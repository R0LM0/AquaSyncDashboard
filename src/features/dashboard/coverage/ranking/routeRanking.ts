import type { RouteRankingRow } from '@/domain/types'
import { localDateKey } from '@/shared/dates'

/**
 * Traffic light of a route: verde from 90 %, amarillo 50 to 89.9 %, rojo below 50 %, and gris
 * for a route with no worked account yet ("sin iniciar").
 */
export type TrafficLight = 'verde' | 'amarillo' | 'rojo' | 'gris'

export const TRAFFIC_LABELS: Record<TrafficLight, string> = {
  verde: 'Completa',
  amarillo: 'En curso',
  rojo: 'Bajo avance',
  gris: 'Sin iniciar',
}

export const TRAFFIC_COLORS: Record<TrafficLight, string> = {
  verde: '#16a34a',
  amarillo: '#ca8a04',
  rojo: '#dc2626',
  gris: '#94a3b8',
}

export function trafficLight(row: Pick<RouteRankingRow, 'trabajadas' | 'avancePct'>): TrafficLight {
  if (row.trabajadas === 0) return 'gris'
  if (row.avancePct >= 90) return 'verde'
  if (row.avancePct >= 50) return 'amarillo'
  return 'rojo'
}

export interface RankingKpis {
  rutas: number
  /** Verde: at least 90 %. */
  completas: number
  /** Started but not complete: amarillo and rojo. */
  enCurso: number
  /** Gris: no worked account. */
  sinIniciar: number
  pendientes: number
}

export function rankingKpis(rows: RouteRankingRow[]): RankingKpis {
  const lights = rows.map((row) => trafficLight(row))
  return {
    rutas: rows.length,
    completas: lights.filter((light) => light === 'verde').length,
    enCurso: lights.filter((light) => light === 'amarillo' || light === 'rojo').length,
    sinIniciar: lights.filter((light) => light === 'gris').length,
    pendientes: rows.reduce((total, row) => total + row.pendientes, 0),
  }
}

export type RankingSortKey = 'ruta' | 'cuentasRuta' | 'trabajadas' | 'pendientes' | 'avancePct' | 'usuarios' | 'ultimaActividad'

/** A new array, sorted by the key. Route codes compare numerically ("9" before "10"). */
export function sortRoutes(
  rows: RouteRankingRow[],
  key: RankingSortKey,
  direction: 'asc' | 'desc',
): RouteRankingRow[] {
  const sign = direction === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const left = a[key] ?? ''
    const right = b[key] ?? ''
    const result =
      typeof left === 'number' && typeof right === 'number'
        ? left - right
        : String(left).localeCompare(String(right), undefined, { numeric: true })
    return result * sign || routeName(a).localeCompare(routeName(b), undefined, { numeric: true })
  })
}

/** Accent-insensitive, case-insensitive search over the three codes of the route. */
export function filterRoutes(rows: RouteRankingRow[], query: string): RouteRankingRow[] {
  const needle = normalize(query.trim())
  if (!needle) return rows
  return rows.filter((row) => [row.filial, row.zona, row.ruta].some((field) => normalize(field).includes(needle)))
}

export function routeName(row: Pick<RouteRankingRow, 'filial' | 'zona' | 'ruta'>): string {
  return [row.filial, row.zona, row.ruta].join(' · ')
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** Ranking file name by day: Cobertura-rutas-<día>.<ext>. */
export function rankingFileName(extension: 'xlsx' | 'pdf', generatedAt: Date): string {
  return `Cobertura-rutas-${localDateKey(generatedAt)}.${extension}`
}
