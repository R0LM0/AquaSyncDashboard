import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { FileSpreadsheet, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { CoverageAccount, Filters, RouteCoverage } from '@/domain/types'
import type { DashboardApi } from '@/ports/DashboardApi'
import { formatDayKey, formatNumber, formatPercent } from '@/shared/format'
import { downloadBlob } from '../report/download'
import { useReducedMotion } from '../useReducedMotion'
import { AXIS_PROPS, GRID_PROPS, TOOLTIP_PROPS, chartAnimation } from '../charts/chartTheme'
import { EmptyState } from '../EmptyState'
import { CoverageMap, type MapFocus } from './CoverageMap'
import { CoverageTables } from './CoverageTables'
import { DEFAULT_LAYER_VISIBILITY, toggleLayer, type LayerVisibility } from './coverageLayers'
import {
  ESTADO_COLORS,
  coverageFileName,
  coverageSlices,
  routeLabel,
  workedPerDay,
  workedPerUser,
} from './coverageAggregates'
import { useRouteCoverage, type RouteRef } from './useRouteCoverage'

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export interface RouteCoveragePanelProps {
  api: DashboardApi
  filters: Filters
  route: RouteRef
  onSessionExpired: () => void
}

/** The coverage of one route: KPIs, charts, map, tables and the Excel and PDF exports. */
export function RouteCoveragePanel({ api, filters, route, onSessionExpired }: RouteCoveragePanelProps) {
  const coverage = useRouteCoverage(api, filters, route, onSessionExpired)

  if (coverage.status === 'idle' || coverage.status === 'loading') {
    return (
      <Card className="space-y-3">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-[280px] w-full" />
      </Card>
    )
  }

  if (coverage.status === 'error' || !coverage.data) {
    return (
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Cobertura de ruta</CardTitle>
            <CardDescription>Ruta {routeLabel(route)}</CardDescription>
          </div>
        </CardHeader>
        <p role="alert" className="text-sm font-semibold text-danger">
          {coverage.error ?? 'No se pudo cargar la cobertura'}
        </p>
      </Card>
    )
  }

  const routeKey = JSON.stringify(route)
  // Keyed by the route: a new route starts with the default layers and no focused account.
  return <CoverageView key={routeKey} coverage={coverage.data} routeKey={routeKey} />
}

function CoverageView({ coverage, routeKey }: { coverage: RouteCoverage; routeKey: string }) {
  const reduced = useReducedMotion()
  const [visibility, setVisibility] = useState<LayerVisibility>(DEFAULT_LAYER_VISIBILITY)
  const [focus, setFocus] = useState<MapFocus | null>(null)

  // Ubicar from the tables: the account's layer is switched on first, so its marker exists to fly to.
  function locate(account: CoverageAccount) {
    setVisibility((current) => (current[account.estado] ? current : { ...current, [account.estado]: true }))
    setFocus((current) => ({ cuenta: account.cuenta, nonce: (current?.nonce ?? 0) + 1 }))
  }
  const [busy, setBusy] = useState<'excel' | 'pdf' | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  const slices = useMemo(() => coverageSlices(coverage.cuentas), [coverage.cuentas])
  const daily = useMemo(
    () => workedPerDay(coverage.cuentas).map((point) => ({ dia: formatDayKey(point.dia), trabajadas: point.trabajadas })),
    [coverage.cuentas],
  )
  const users = useMemo(() => workedPerUser(coverage.cuentas), [coverage.cuentas])
  const hasFueraDeRuta = coverage.fueraDeRuta > 0

  async function exportReport(kind: 'excel' | 'pdf') {
    setBusy(kind)
    setExportError(null)
    try {
      const generatedAt = new Date()
      if (kind === 'excel') {
        const { buildCoverageWorkbook } = await import('./coverageExcel')
        const buffer = await buildCoverageWorkbook(coverage, generatedAt).xlsx.writeBuffer()
        downloadBlob(new Blob([buffer], { type: XLSX_MIME }), coverageFileName(coverage, generatedAt, 'xlsx'))
      } else {
        const { buildCoveragePdf } = await import('./coveragePdf')
        buildCoveragePdf(coverage, generatedAt).save(coverageFileName(coverage, generatedAt, 'pdf'))
      }
    } catch {
      setExportError('No se pudo generar el reporte. Intentá de nuevo.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Cobertura de ruta</CardTitle>
            <CardDescription>
              Ruta {routeLabel(coverage)} · cuentas trabajadas y pendientes en el período
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void exportReport('excel')} disabled={busy !== null}>
              <FileSpreadsheet aria-hidden="true" />
              {busy === 'excel' ? 'Generando…' : 'Excel'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => void exportReport('pdf')} disabled={busy !== null}>
              <FileText aria-hidden="true" />
              {busy === 'pdf' ? 'Generando…' : 'PDF'}
            </Button>
          </div>
        </CardHeader>

        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Kpi label="Cuentas de la ruta" value={formatNumber(coverage.cuentasRuta)} testId="cobertura-cuentasRuta" />
          <Kpi label="Trabajadas" value={formatNumber(coverage.trabajadas)} color={ESTADO_COLORS.trabajada} testId="cobertura-trabajadas" />
          <Kpi label="Pendientes" value={formatNumber(coverage.pendientes)} color={ESTADO_COLORS.pendiente} testId="cobertura-pendientes" />
          <Kpi label="Avance" value={formatPercent(coverage.avancePct)} testId="cobertura-avance" />
          {hasFueraDeRuta ? (
            <Kpi label="Fuera de ruta" value={formatNumber(coverage.fueraDeRuta)} color={ESTADO_COLORS.fuera_de_ruta} testId="cobertura-fueraDeRuta" />
          ) : null}
        </dl>

        {exportError ? (
          <p role="alert" className="mt-3 text-xs font-semibold text-danger">
            {exportError}
          </p>
        ) : null}
      </Card>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Trabajadas vs pendientes</CardTitle>
              <CardDescription>Cuentas de la ruta por estado</CardDescription>
            </div>
          </CardHeader>
          {slices.length === 0 ? (
            <EmptyState title="Ruta sin cuentas" />
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie
                    data={slices}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="58%"
                    outerRadius="90%"
                    paddingAngle={2}
                    stroke="none"
                    {...chartAnimation(reduced)}
                  >
                    {slices.map((slice) => (
                      <Cell key={slice.estado} fill={slice.color} />
                    ))}
                  </Pie>
                  <Tooltip {...TOOLTIP_PROPS} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="space-y-2 text-xs font-semibold text-muted-fg">
                {slices.map((slice) => (
                  <li key={slice.estado} className="inline-flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ background: slice.color }} aria-hidden="true" />
                    {slice.name}: <span className="tabular-nums text-fg">{formatNumber(slice.value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Trabajadas por día</CardTitle>
              <CardDescription>Según la primera actividad de cada cuenta</CardDescription>
            </div>
          </CardHeader>
          {daily.length === 0 ? (
            <EmptyState title="Sin cuentas trabajadas en el período" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={daily}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="dia" {...AXIS_PROPS} />
                <YAxis allowDecimals={false} {...AXIS_PROPS} />
                <Tooltip {...TOOLTIP_PROPS} />
                <Bar dataKey="trabajadas" name="Trabajadas" fill={ESTADO_COLORS.trabajada} radius={[4, 4, 0, 0]} {...chartAnimation(reduced)} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Mapa de la ruta</CardTitle>
              <CardDescription>Cuentas con coordenadas, por estado</CardDescription>
            </div>
          </CardHeader>
          <CoverageMap
            accounts={coverage.cuentas}
            routeKey={routeKey}
            visibility={visibility}
            onToggleLayer={(estado) => setVisibility((current) => toggleLayer(current, estado))}
            focus={focus}
          />
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Trabajadas por usuario</CardTitle>
              <CardDescription>Último usuario de cada cuenta</CardDescription>
            </div>
          </CardHeader>
          {users.length === 0 ? (
            <EmptyState title="Ningún usuario trabajó la ruta" />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(160, users.length * 30 + 20)}>
              <BarChart data={users} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis type="number" allowDecimals={false} hide />
                <YAxis type="category" dataKey="usuario" width={96} {...AXIS_PROPS} />
                <Tooltip {...TOOLTIP_PROPS} />
                <Bar dataKey="trabajadas" name="Trabajadas" fill={ESTADO_COLORS.trabajada} radius={[0, 4, 4, 0]} barSize={14} {...chartAnimation(reduced)} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Cuentas de la ruta</CardTitle>
            <CardDescription>Pendientes, trabajadas y fuera de ruta, con búsqueda por cuenta, cliente o dirección</CardDescription>
          </div>
        </CardHeader>
        <CoverageTables accounts={coverage.cuentas} onLocate={locate} />
      </Card>
    </div>
  )
}

function Kpi({ label, value, color, testId }: { label: string; value: string; color?: string; testId: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-2/50 p-3" data-testid={testId}>
      <dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-fg">{label}</dt>
      <dd className="mt-1 text-2xl font-extrabold tabular-nums text-fg" style={color ? { color } : undefined}>
        {value}
      </dd>
    </div>
  )
}
