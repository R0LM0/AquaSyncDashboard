import { useMemo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { DailyProgress } from '@/domain/types'
import { formatNumber } from '@/shared/format'
import { Skeleton } from '@/components/ui/skeleton'
import { useReducedMotion } from '../useReducedMotion'
import { TOOLTIP_PROPS, chartAnimation } from './chartTheme'
import { changeTypeSlices } from './changeTypeSlices'

export function ChangeTypeDonut({ daily, loading }: { daily: DailyProgress[]; loading?: boolean }) {
  const reduced = useReducedMotion()
  const slices = useMemo(() => changeTypeSlices(daily), [daily])
  const total = slices.reduce((acc, slice) => acc + slice.value, 0)

  if (loading) return <Skeleton className="h-[260px] w-full" />
  if (total === 0) return <p className="py-16 text-center text-sm text-muted-fg">Sin cambios para distribuir.</p>

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Tooltip {...TOOLTIP_PROPS} />
          <Pie
            data={slices}
            dataKey="value"
            nameKey="label"
            innerRadius={68}
            outerRadius={96}
            paddingAngle={2}
            stroke="none"
            {...chartAnimation(reduced)}
          >
            {slices.map((slice) => (
              <Cell key={slice.tipo} fill={slice.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold tracking-tight text-fg">{formatNumber(total)}</span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">cambios</span>
      </div>

      <ul className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-muted-fg">
        {slices.map((slice) => (
          <li key={slice.tipo} className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: slice.color }} aria-hidden="true" />
            {slice.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
