import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CHANGE_TYPE_COLORS, CHANGE_TYPE_LABELS, CHANGE_TYPES } from '@/domain/labels'
import type { ChangeType, DailyProgress } from '@/domain/types'
import { formatDayKey } from '@/shared/format'
import { EmptyState } from '../EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { useReducedMotion } from '../useReducedMotion'
import { AXIS_PROPS, GRID_PROPS, TOOLTIP_PROPS, chartAnimation } from './chartTheme'

type DayRow = { fecha: string } & Record<ChangeType, number>

const EMPTY_ROW: Record<ChangeType, number> = {
  FotoNueva: 0,
  FotoActualizada: 0,
  UbicacionNueva: 0,
  UbicacionCorregida: 0,
}

export function ActivityAreaChart({ daily, loading }: { daily: DailyProgress[]; loading?: boolean }) {
  const reduced = useReducedMotion()
  const data = useMemo(() => {
    const days = new Map<string, DayRow>()
    for (const row of daily) {
      const current = days.get(row.fecha) ?? ({ fecha: row.fecha, ...EMPTY_ROW } as DayRow)
      current[row.tipoCambio] += row.cambios
      days.set(row.fecha, current)
    }
    return [...days.values()].sort((a, b) => a.fecha.localeCompare(b.fecha))
  }, [daily])

  if (loading) return <Skeleton className="h-[300px] w-full" />
  if (data.length === 0) {
    return <EmptyState title="Sin cambios en el período" detail="Probá con otro rango de fechas o menos filtros." />
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 8, right: 10, bottom: 0, left: -12 }}>
        <defs>
          {CHANGE_TYPES.map((tipo) => (
            <linearGradient key={tipo} id={`grad-${tipo}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHANGE_TYPE_COLORS[tipo]} stopOpacity={0.75} />
              <stop offset="100%" stopColor={CHANGE_TYPE_COLORS[tipo]} stopOpacity={0.04} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid {...GRID_PROPS} />
        <XAxis
          dataKey="fecha"
          {...AXIS_PROPS}
          tickFormatter={(value: string) => formatDayKey(value).slice(0, 5)}
          minTickGap={18}
        />
        <YAxis {...AXIS_PROPS} allowDecimals={false} width={44} />
        <Tooltip {...TOOLTIP_PROPS} labelFormatter={(value) => formatDayKey(String(value))} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
        {CHANGE_TYPES.map((tipo) => (
          <Area
            key={tipo}
            type="monotone"
            dataKey={tipo}
            name={CHANGE_TYPE_LABELS[tipo]}
            stackId="dia"
            stroke={CHANGE_TYPE_COLORS[tipo]}
            strokeWidth={2}
            fill={`url(#grad-${tipo})`}
            {...chartAnimation(reduced)}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}
