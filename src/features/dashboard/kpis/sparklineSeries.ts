import type { DailyProgress, Summary } from '@/domain/types'

export type SparkKey = 'cuentasTrabajadas' | 'fotosNuevas' | 'fotosActualizadas' | 'ubicaciones' | 'usuariosActivos'

export interface SparkPoint {
  fecha: string
  valor: number
}

/**
 * Daily series per KPI, derived from the already loaded daily progress so the
 * sparkline never costs an extra request.
 */
export function sparklineSeries(daily: DailyProgress[], key: SparkKey, maxDays = 14): SparkPoint[] {
  const byDay = new Map<string, number>()
  const usersByDay = new Map<string, Set<string>>()

  for (const row of daily) {
    const users = usersByDay.get(row.fecha) ?? new Set<string>()
    users.add(row.usuario)
    usersByDay.set(row.fecha, users)

    const counts = key === 'fotosNuevas'
      ? row.tipoCambio === 'FotoNueva'
      : key === 'fotosActualizadas'
        ? row.tipoCambio === 'FotoActualizada'
        : key === 'ubicaciones'
          ? row.tipoCambio === 'UbicacionNueva' || row.tipoCambio === 'UbicacionCorregida'
          : true

    if (counts) byDay.set(row.fecha, (byDay.get(row.fecha) ?? 0) + row.cambios)
  }

  const dates = [...new Set([...byDay.keys(), ...usersByDay.keys()])].sort()

  return dates.slice(-maxDays).map((fecha) => ({
    fecha,
    valor: key === 'usuariosActivos' ? (usersByDay.get(fecha)?.size ?? 0) : (byDay.get(fecha) ?? 0),
  }))
}

export type KpiKey = keyof Summary

export const KPI_ORDER: readonly KpiKey[] = [
  'cuentasTrabajadas',
  'fotosNuevas',
  'fotosActualizadas',
  'ubicaciones',
  'usuariosActivos',
  'avanceRutaPct',
]
