import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSectionContext } from '../sectionContext'
import { KpiCards } from '../kpis/KpiCards'
import { ActivityAreaChart } from '../charts/ActivityAreaChart'
import { ChangeTypeDonut } from '../charts/ChangeTypeDonut'
import { MapPanel } from '../map/MapPanel'
import { LiveFeed } from '../live/LiveFeed'
import { SectionSkeleton } from '../SectionSkeleton'
import { EMPTY_SUMMARY } from './emptySummary'

export default function ResumenPage() {
  const { data, loading, previousSummary, points, highlight, live, openAccount, filters, fitKey } =
    useSectionContext()

  if (loading) return <SectionSkeleton />

  return (
    <div className="space-y-3">
      <KpiCards
        summary={data?.summary ?? EMPTY_SUMMARY}
        previous={previousSummary}
        daily={data?.daily}
      />

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Actividad diaria</CardTitle>
              <CardDescription>Cambios registrados por día y tipo de cambio</CardDescription>
            </div>
          </CardHeader>
          <ActivityAreaChart daily={data?.daily ?? []} />
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Distribución por tipo</CardTitle>
              <CardDescription>Total del período filtrado</CardDescription>
            </div>
          </CardHeader>
          <ChangeTypeDonut daily={data?.daily ?? []} />
        </Card>
      </div>

      <div className="grid items-stretch gap-3 lg:grid-cols-3">
        <Card className="flex flex-col overflow-hidden p-0 lg:col-span-2">
          <div className="p-4 pb-2">
            <CardTitle>Mapa de Nicaragua</CardTitle>
            <CardDescription>Último cambio por cuenta, agrupado por cercanía</CardDescription>
          </div>
          <div className="min-h-0 flex-1">
            <MapPanel
              points={points}
              highlight={highlight}
              height="max(560px, 65vh)"
              ugestionId={filters.ugestionId}
              sucursalId={filters.sucursalId}
              fitKey={fitKey}
              onSelectAccount={openAccount}
            />
          </div>
        </Card>

        <Card className="flex min-h-0 flex-col">
          <LiveFeed
            items={live.feed}
            status={live.status}
            paused={live.paused}
            onTogglePaused={live.togglePaused}
          />
        </Card>
      </div>
    </div>
  )
}
