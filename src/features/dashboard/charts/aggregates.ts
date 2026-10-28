import type { UserRouteProgress } from '@/domain/types'

export interface RouteAggregate {
  ruta: string
  filial: string
  zona: string
  trabajadas: number
  total: number
  pct: number
}

function pctOf(trabajadas: number, total: number): number {
  return total > 0 ? Math.min(100, Math.round((trabajadas / total) * 100)) : 0
}

/** One row per route: `cuentasRuta` is the route total, so it is not summed. */
export function routeAggregates(progress: UserRouteProgress[]): RouteAggregate[] {
  const routes = new Map<string, RouteAggregate>()

  for (const row of progress) {
    const current =
      routes.get(row.ruta) ?? {
        ruta: row.ruta,
        filial: row.filial,
        zona: row.zona,
        trabajadas: 0,
        total: row.cuentasRuta,
        pct: 0,
      }
    current.trabajadas += row.cuentasTrabajadas
    current.total = Math.max(current.total, row.cuentasRuta)
    routes.set(row.ruta, current)
  }

  return [...routes.values()]
    .map((route) => ({ ...route, pct: pctOf(route.trabajadas, route.total) }))
    .sort((a, b) => b.pct - a.pct)
}

export function overallProgress(progress: UserRouteProgress[]): { trabajadas: number; total: number; pct: number } {
  const routes = routeAggregates(progress)
  const trabajadas = routes.reduce((acc, route) => acc + route.trabajadas, 0)
  const total = routes.reduce((acc, route) => acc + route.total, 0)

  return { trabajadas, total, pct: pctOf(trabajadas, total) }
}

export interface UserRankingRow {
  usuario: string
  cambios: number
  iniciales: string
}

/** Users ranked by registered changes, with initials for the avatar. */
export function userRanking(daily: Array<{ usuario: string; cambios: number }>, limit = 8): UserRankingRow[] {
  const totals = new Map<string, number>()
  for (const row of daily) totals.set(row.usuario, (totals.get(row.usuario) ?? 0) + row.cambios)

  return [...totals.entries()]
    .map(([usuario, cambios]) => ({ usuario, cambios, iniciales: initialsOf(usuario) }))
    .sort((a, b) => b.cambios - a.cambios || a.usuario.localeCompare(b.usuario))
    .slice(0, limit)
}

function initialsOf(usuario: string): string {
  const letters = usuario.replace(/[^a-zA-Z]/g, '')
  return letters.slice(0, 2).toUpperCase()
}
