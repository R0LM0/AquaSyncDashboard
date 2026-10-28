import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSectionContext } from '../sectionContext'
import { UserRankingBars } from '../charts/UserRankingBars'
import { UserRouteTable } from '../tables/UserRouteTable'
import { SectionSkeleton } from '../SectionSkeleton'

export default function UsuariosPage() {
  const { data, loading } = useSectionContext()

  if (loading) return <SectionSkeleton />

  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Ranking de usuarios</CardTitle>
              <CardDescription>Cambios registrados, de mayor a menor</CardDescription>
            </div>
          </CardHeader>
          <UserRankingBars daily={data?.daily ?? []} />
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Distribución por usuario y ruta</CardTitle>
              <CardDescription>Cuentas trabajadas y última actividad</CardDescription>
            </div>
          </CardHeader>
          <UserRouteTable progress={data?.progress ?? []} />
        </Card>
      </div>
    </div>
  )
}
