import { CHANGE_TYPE_COLORS } from '@/domain/labels'
import type { UserRouteProgress } from '@/domain/types'
import { formatNumber, formatPercent } from '@/shared/format'
import { Skeleton } from '@/components/ui/skeleton'
import { useReducedMotion } from '../useReducedMotion'
import { routeAggregates } from './aggregates'

/** Animated horizontal bars, one per route, with a gradient fill. */
export function RouteProgressBars({
  progress,
  loading,
}: {
  progress: UserRouteProgress[]
  loading?: boolean
}) {
  const reduced = useReducedMotion()
  const routes = routeAggregates(progress)

  if (loading) return <Skeleton className="h-[300px] w-full" />
  if (routes.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-fg">
        Sin rutas con avance en el período.
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {routes.map((route) => (
        <li key={route.ruta}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
            <span className="truncate font-semibold text-fg">{route.ruta}</span>
            <span className="shrink-0 text-muted-fg">
              {formatNumber(route.trabajadas)} / {formatNumber(route.total)} ·{' '}
              <strong className="text-fg">{formatPercent(route.pct)}</strong>
            </span>
          </div>
          <div
            className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2"
            role="progressbar"
            aria-valuenow={route.pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Avance de ${route.ruta}`}
          >
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{
                width: `${route.pct}%`,
                background: `linear-gradient(90deg, ${CHANGE_TYPE_COLORS.FotoNueva}, ${CHANGE_TYPE_COLORS.FotoActualizada})`,
                transitionDuration: reduced ? '0ms' : undefined,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
