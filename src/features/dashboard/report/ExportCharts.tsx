import { useEffect } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'
import { CHANGE_TYPE_COLORS, CHANGE_TYPE_LABELS, CHANGE_TYPES } from '@/domain/labels'
import type { DailyProgress, UserRouteProgress } from '@/domain/types'
import { formatDayKey } from '@/shared/format'
import { routeAggregates } from '../charts/aggregates'

export interface ExportChartsProps {
  daily: DailyProgress[]
  progress: UserRouteProgress[]
  /** Called once the charts are mounted and painted. */
  onReady: () => void
}

const normaliseDaily = (daily: DailyProgress[]) => {
  const days = new Map<string, Record<string, number | string>>()
  for (const row of daily) {
    const current = days.get(row.fecha) ?? { fecha: row.fecha }
    current[row.tipoCambio] = Number(current[row.tipoCambio] ?? 0) + row.cambios
    days.set(row.fecha, current)
  }
  return [...days.values()].sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)))
}

const donutData = (daily: DailyProgress[]) => {
  const totals = new Map<string, number>()
  for (const row of daily) totals.set(row.tipoCambio, (totals.get(row.tipoCambio) ?? 0) + row.cambios)

  return CHANGE_TYPES.map((tipo) => ({
    name: CHANGE_TYPE_LABELS[tipo],
    value: totals.get(tipo) ?? 0,
    color: CHANGE_TYPE_COLORS[tipo],
  })).filter((slice) => slice.value > 0)
}

/**
 * Off-screen charts used only to snapshot the PDF cover: fixed size, no
 * animation, and one frame of delay so recharts has painted before rasterizing.
 */
export function ExportCharts({ daily, progress, onReady }: ExportChartsProps) {
  const routes = routeAggregates(progress).slice(0, 8)

  useEffect(() => {
    onReady()
  }, [onReady])

  return (
    <div
      aria-hidden="true"
      style={{ position: 'fixed', left: -20_000, top: 0, width: 1440, pointerEvents: 'none' }}
    >
      <div data-report-chart="daily" style={{ width: 440, height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={normaliseDaily(daily)}>
            <XAxis dataKey="fecha" tickFormatter={(value: string) => formatDayKey(value).slice(0, 5)} />
            <YAxis />
            {CHANGE_TYPES.map((tipo) => (
              <Area
                key={tipo}
                type="monotone"
                dataKey={tipo}
                stackId="dia"
                stroke={CHANGE_TYPE_COLORS[tipo]}
                fill={CHANGE_TYPE_COLORS[tipo]}
                fillOpacity={0.35}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div data-report-chart="donut" style={{ width: 300, height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={donutData(daily)}
              dataKey="value"
              nameKey="name"
              innerRadius={48}
              outerRadius={84}
              isAnimationActive={false}
            >
              {donutData(daily).map((slice) => (
                <Cell key={slice.name} fill={slice.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div data-report-chart="routes" style={{ width: 440, height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={routes.map((route) => ({ ruta: route.ruta, avance: route.pct }))}>
            <XAxis dataKey="ruta" />
            <YAxis domain={[0, 100]} />
            <Bar dataKey="avance" fill={CHANGE_TYPE_COLORS.FotoActualizada} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
