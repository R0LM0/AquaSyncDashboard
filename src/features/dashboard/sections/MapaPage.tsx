import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSectionContext } from '../sectionContext'
import { MapPanel } from '../map/MapPanel'
import { ChangeTypeDonut } from '../charts/ChangeTypeDonut'
import { LiveFeed } from '../live/LiveFeed'
import { KpiCards } from '../kpis/KpiCards'
import { SectionSkeleton } from '../SectionSkeleton'
import { EMPTY_SUMMARY } from './emptySummary'

export default function MapaPage() {
  const { data, loading, previousSummary, points, highlight, live, filters, alcance, openAccount, fitKey } =
    useSectionContext()

  if (loading) return <SectionSkeleton />

  return (
    <div className="space-y-3">
      <KpiCards
        summary={data?.summary ?? EMPTY_SUMMARY}
        previous={previousSummary}
        daily={data?.daily}
      />

      <div className="grid items-stretch gap-3 lg:grid-cols-3">
        <Card className="flex flex-col overflow-hidden p-0 lg:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-2 p-4 pb-2">
            <div>
              <CardTitle>Mapa de predios trabajados</CardTitle>
              <CardDescription>
                {filters.ruta ? `Ruta ${filters.ruta}` : 'Todas las rutas'} ·{' '}
                {filters.usuario ? `Usuario ${filters.usuario}` : 'Todos los usuarios'} ·{' '}
                {points.length} cuentas con coordenadas
              </CardDescription>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <MapPanel
              points={points}
              highlight={highlight}
              height="max(600px, calc(100vh - var(--app-chrome, 200px) - 32px))"
              ugestionId={filters.ugestionId}
              sucursalId={filters.sucursalId}
              desde={filters.desde}
              hasta={filters.hasta}
              home={alcance.mapa}
              homeLabel={alcance.pais ? 'Centrar en Nicaragua' : 'Centrar en mi zona'}
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

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Composición de los cambios</CardTitle>
            <CardDescription>Qué se hizo en el campo en el período filtrado</CardDescription>
          </div>
        </CardHeader>
        <ChangeTypeDonut daily={data?.daily ?? []} />
      </Card>
    </div>
  )
}
