import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSectionContext } from '../sectionContext'
import { RouteGauge } from '../charts/RouteGauge'
import { RouteProgressBars } from '../charts/RouteProgressBars'
import { UserRouteTable } from '../tables/UserRouteTable'
import { SectionSkeleton } from '../SectionSkeleton'

export default function RutasPage() {
  const { data, loading } = useSectionContext()

  if (loading) return <SectionSkeleton />

  const progress = data?.progress ?? []

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
            <CardDescription>Ordená por cualquier columna</CardDescription>
          </div>
        </CardHeader>
        <UserRouteTable progress={progress} />
      </Card>
    </div>
  )
}
