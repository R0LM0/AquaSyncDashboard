import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSectionContext } from '../sectionContext'
import { ChangesTable } from '../tables/ChangesTable'
import { ExportMenu } from '../report/ExportMenu'
import { SectionSkeleton } from '../SectionSkeleton'

export default function ReportesPage() {
  const {
    filters,
    changes,
    changesError,
    changesLoading,
    pageNumber,
    pageSize,
    setPageNumber,
    report,
    loading,
  } = useSectionContext()

  if (loading) return <SectionSkeleton />

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Detalle y reportes</CardTitle>
            <CardDescription>
              {filters.ruta ? `Ruta ${filters.ruta}` : 'Todas las rutas'} ·{' '}
              {filters.usuario ? `Usuario ${filters.usuario}` : 'Todos los usuarios'} · {filters.desde}{' '}
              a {filters.hasta}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 no-print">
            <ExportMenu busy={report.busy} warning={report.warning} onExport={report.exportReport} />
          </div>
        </CardHeader>

        <ChangesTable
          page={changes}
          pageNumber={pageNumber}
          pageSize={pageSize}
          onPageChange={setPageNumber}
          error={changesError}
          loading={changesLoading}
        />
      </Card>
    </div>
  )
}
