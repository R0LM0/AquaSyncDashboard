import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CHANGE_TYPE_COLORS, CHANGE_TYPE_LABELS, CHANGE_TYPES } from '../../../domain/labels'
import type { ChangeType, DailyProgress } from '../../../domain/types'
import { formatDayKey } from '../../../shared/format'

type DayRow = { fecha: string } & Record<ChangeType, number>

export function DailyActivityChart({ daily }: { daily: DailyProgress[] }) {
  const data = useMemo(() => {
    const days = new Map<string, DayRow>()

    for (const row of daily) {
      const current =
        days.get(row.fecha) ??
        ({
          fecha: row.fecha,
          FotoNueva: 0,
          FotoActualizada: 0,
          UbicacionNueva: 0,
          UbicacionCorregida: 0,
        } as DayRow)
      current[row.tipoCambio] += row.cambios
      days.set(row.fecha, current)
    }

    return [...days.values()].sort((a, b) => a.fecha.localeCompare(b.fecha))
  }, [daily])

  if (data.length === 0) return <p className="empty">Sin actividad en el período seleccionado.</p>

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
        <XAxis
          dataKey="fecha"
          tickFormatter={(value: string) => formatDayKey(value).slice(0, 5)}
          minTickGap={16}
        />
        <YAxis allowDecimals={false} width={36} />
        <Tooltip labelFormatter={(value) => formatDayKey(String(value))} />
        <Legend />
        {CHANGE_TYPES.map((tipo) => (
          <Bar
            key={tipo}
            dataKey={tipo}
            name={CHANGE_TYPE_LABELS[tipo]}
            stackId="dia"
            fill={CHANGE_TYPE_COLORS[tipo]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
