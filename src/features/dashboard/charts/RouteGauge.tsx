import { RadialBar, RadialBarChart, PolarAngleAxis, ResponsiveContainer } from 'recharts'
import { CHANGE_TYPE_COLORS } from '@/domain/labels'
import type { UserRouteProgress } from '@/domain/types'
import { formatNumber, formatPercent } from '@/shared/format'
import { useReducedMotion } from '../useReducedMotion'
import { chartAnimation } from './chartTheme'
import { overallProgress } from './aggregates'

/** Overall route progress as a gauge, with the totals underneath. */
export function RouteGauge({ progress }: { progress: UserRouteProgress[] }) {
  const reduced = useReducedMotion()
  const { trabajadas, total, pct } = overallProgress(progress)
  const data = [{ name: 'Avance', value: pct, fill: CHANGE_TYPE_COLORS.FotoActualizada }]

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full max-w-[220px]">
        <ResponsiveContainer width="100%" height={160}>
          <RadialBarChart
            data={data}
            innerRadius="72%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            barSize={14}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar
              dataKey="value"
              background={{ fill: 'hsl(var(--surface-2))' }}
              cornerRadius={999}
              {...chartAnimation(reduced)}
            />
          </RadialBarChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-2">
          <span className="text-2xl font-extrabold tracking-tight text-fg">{formatPercent(pct)}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">avance</span>
        </div>
      </div>

      <p className="mt-1 text-xs text-muted-fg">
        {formatNumber(trabajadas)} de {formatNumber(total)} cuentas de las rutas filtradas
      </p>
    </div>
  )
}
