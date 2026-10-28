import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CHANGE_TYPE_COLORS } from '@/domain/labels'
import type { DailyProgress } from '@/domain/types'
import { Skeleton } from '@/components/ui/skeleton'
import { useReducedMotion } from '../useReducedMotion'
import { AXIS_PROPS, GRID_PROPS, TOOLTIP_PROPS, chartAnimation } from './chartTheme'
import { userRanking } from './aggregates'

/** Ranking with position, initials avatar and a gradient bar. */
export function UserRankingBars({ daily, loading }: { daily: DailyProgress[]; loading?: boolean }) {
  const reduced = useReducedMotion()
  const rows = userRanking(daily)

  if (loading) return <Skeleton className="h-[300px] w-full" />
  if (rows.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-fg">
        Sin usuarios con actividad en el período.
      </div>
    )
  }

  const max = Math.max(...rows.map((row) => row.cambios), 1)

  return (
    <div className="space-y-2">
      <ul className="flex flex-col gap-2">
        {rows.map((row, index) => (
          <li key={row.usuario} className="flex items-center gap-2.5">
            <span className="w-4 shrink-0 text-right text-[11px] font-bold text-muted-fg">{index + 1}</span>
            <span
              className="grid size-7 shrink-0 place-items-center rounded-full text-[10px] font-extrabold text-primary-fg"
              style={{
                background: `linear-gradient(135deg, ${CHANGE_TYPE_COLORS.FotoNueva}, ${CHANGE_TYPE_COLORS.UbicacionCorregida})`,
              }}
              aria-hidden="true"
            >
              {row.iniciales}
            </span>
            <span className="w-24 shrink-0 truncate text-xs font-semibold text-fg">{row.usuario}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full transition-[width] duration-700 ease-out"
                style={{
                  width: `${(row.cambios / max) * 100}%`,
                  background: `linear-gradient(90deg, ${CHANGE_TYPE_COLORS.FotoNueva}, ${CHANGE_TYPE_COLORS.FotoActualizada})`,
                  transitionDuration: reduced ? '0ms' : undefined,
                }}
              />
            </div>
            <span className="w-10 shrink-0 text-right text-xs font-bold text-fg">{row.cambios}</span>
          </li>
        ))}
      </ul>

      <div className="h-[120px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="usuario" {...AXIS_PROPS} interval={0} angle={-18} textAnchor="end" height={40} />
            <YAxis {...AXIS_PROPS} allowDecimals={false} width={40} />
            <Tooltip {...TOOLTIP_PROPS} />
            <Bar
              dataKey="cambios"
              name="Cambios"
              fill={CHANGE_TYPE_COLORS.FotoNueva}
              radius={[6, 6, 0, 0]}
              {...chartAnimation(reduced)}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
