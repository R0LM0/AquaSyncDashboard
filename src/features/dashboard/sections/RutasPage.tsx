import { useState } from 'react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSectionContext } from '../sectionContext'
import { RouteGauge } from '../charts/RouteGauge'
import { RouteProgressBars } from '../charts/RouteProgressBars'
import { UserRouteTable } from '../tables/UserRouteTable'
import { SectionSkeleton } from '../SectionSkeleton'
import { EmptyState } from '../EmptyState'
import { RouteCoveragePanel } from '../coverage/RouteCoveragePanel'
import type { RouteRef } from '../coverage/useRouteCoverage'
import { RouteRankingPanel } from '../coverage/ranking/RouteRankingPanel'

/** A route picked in the table: it holds only for the filters it was picked under. */
interface PickedRoute {
  filtersKey: string
  route: RouteRef
}

export default function RutasPage() {
  const { api, data, loading, filters, onSessionExpired } = useSectionContext()
  // The route lives in component state, never in the URL.
  const [picked, setPicked] = useState<PickedRoute | null>(null)

  if (loading) return <SectionSkeleton />

  const progress = data?.progress ?? []
  const filtersKey = JSON.stringify(filters)
  const fromFilters: RouteRef | null =
    filters.filial && filters.zona && filters.ruta
      ? { filial: filters.filial, zona: filters.zona, ruta: filters.ruta }
      : null
  const route = picked && picked.filtersKey === filtersKey ? picked.route : fromFilters
  // The ranking compares the routes of one unidad or sucursal: it needs one of them in the filters.
  const hasUnit = Boolean(filters.ugestionId || filters.sucursalId)

  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Avance general</CardTitle>
              <CardDescription>Sobre las rutas del filtro</CardDescription>
            </div>
          </CardHeader>
          <RouteGauge progress={progress} />
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Avance por ruta</CardTitle>
              <CardDescription>Cuentas trabajadas sobre el total de cada ruta</CardDescription>
            </div>
          </CardHeader>
          <RouteProgressBars progress={progress} />
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Detalle por usuario y ruta</CardTitle>
            <CardDescription>Ordená por cualquier columna. Tocá una fila para ver la cobertura de su ruta</CardDescription>
          </div>
        </CardHeader>
        <UserRouteTable
          progress={progress}
          onSelectRoute={(row) =>
            setPicked({ filtersKey, route: { filial: row.filial, zona: row.zona, ruta: row.ruta } })
          }
        />
      </Card>

      {hasUnit ? (
        <RouteRankingPanel
          api={api}
          filters={filters}
          onSessionExpired={onSessionExpired}
          onSelectRoute={(selected) => setPicked({ filtersKey, route: selected })}
        />
      ) : (
        <Card>
          <EmptyState
            title="Elegí una unidad de gestión o sucursal para ver el ranking de rutas"
            detail="El ranking compara todas las rutas de esa unidad."
          />
        </Card>
      )}

      {route ? (
        <RouteCoveragePanel api={api} filters={filters} route={route} onSessionExpired={onSessionExpired} />
      ) : (
        <Card>
          <EmptyState
            title="Elegí una ruta para ver qué cuentas faltan"
            detail="Tocá una fila del detalle por usuario o elegí filial, zona y ruta en los filtros."
          />
        </Card>
      )}
    </div>
  )
}
