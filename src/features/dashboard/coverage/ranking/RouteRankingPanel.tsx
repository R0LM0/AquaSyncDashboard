import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, FileSpreadsheet, FileText, Search } from 'lucide-react'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { Filters, RouteRankingRow } from '@/domain/types'
import type { DashboardApi } from '@/ports/DashboardApi'
import { formatDateTime, formatNumber } from '@/shared/format'
import { cn } from '@/lib/utils'
import { downloadBlob } from '../../report/download'
import { useReducedMotion } from '../../useReducedMotion'
import { AXIS_PROPS, TOOLTIP_PROPS, chartAnimation } from '../../charts/chartTheme'
import { EmptyState } from '../../EmptyState'
import type { RouteRef } from '../useRouteCoverage'
import { useRouteRanking } from './useRouteRanking'
import {
  TRAFFIC_COLORS,
  TRAFFIC_LABELS,
  filterRoutes,
  rankingFileName,
  rankingKpis,
  routeName,
  sortRoutes,
  trafficLight,
  type RankingSortKey,
} from './routeRanking'

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const WORST_BARS = 10

const COLUMNS: Array<{ key: RankingSortKey; label: string; numeric: boolean }> = [
  { key: 'ruta', label: 'Ruta', numeric: false },
  { key: 'cuentasRuta', label: 'Cuentas ruta', numeric: true },
  { key: 'trabajadas', label: 'Trabajadas', numeric: true },
  { key: 'pendientes', label: 'Pendientes', numeric: true },
  { key: 'avancePct', label: 'Avance', numeric: true },
  { key: 'usuarios', label: 'Usuarios', numeric: true },
  { key: 'ultimaActividad', label: 'Última actividad', numeric: false },
]

export interface RouteRankingPanelProps {
  api: DashboardApi
  filters: Filters
  onSessionExpired: () => void
  /** A click on a route opens its coverage below the ranking. */
  onSelectRoute: (route: RouteRef) => void
}

/** Cobertura de rutas: every route of the unit, worst first, with a traffic light per route. */
export function RouteRankingPanel({ api, filters, onSessionExpired, onSelectRoute }: RouteRankingPanelProps) {
  const ranking = useRouteRanking(api, filters, true, onSessionExpired)

  if (ranking.status === 'idle' || ranking.status === 'loading') {
    return (
      <Card className="space-y-3">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-[260px] w-full" />
      </Card>
    )
  }

  if (ranking.status === 'error' || !ranking.rows) {
    return (
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Cobertura de rutas</CardTitle>
            <CardDescription>Ranking de las rutas de la unidad</CardDescription>
          </div>
        </CardHeader>
        <p role="alert" className="text-sm font-semibold text-danger">
          {ranking.error ?? 'No se pudo cargar el ranking de rutas'}
        </p>
      </Card>
    )
  }

  return <RankingView rows={ranking.rows} onSelectRoute={onSelectRoute} />
}

function RankingView({ rows, onSelectRoute }: { rows: RouteRankingRow[]; onSelectRoute: (route: RouteRef) => void }) {
  const reduced = useReducedMotion()
  const [sort, setSort] = useState<{ key: RankingSortKey; direction: 'asc' | 'desc' }>({ key: 'avancePct', direction: 'asc' })
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState<'excel' | 'pdf' | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  const kpis = useMemo(() => rankingKpis(rows), [rows])
  const worst = useMemo(
    () =>
      sortRoutes(rows, 'avancePct', 'asc')
        .slice(0, WORST_BARS)
        .map((row) => ({
          label: `${row.zona} · ${row.ruta}`,
          avancePct: row.avancePct,
          color: TRAFFIC_COLORS[trafficLight(row)],
        })),
    [rows],
  )
  const table = useMemo(
    () => sortRoutes(filterRoutes(rows, query), sort.key, sort.direction),
    [rows, query, sort],
  )

  function toggleSort(column: (typeof COLUMNS)[number]) {
    setSort((current) =>
      current.key === column.key
        ? { key: column.key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key: column.key, direction: column.numeric ? 'desc' : 'asc' },
    )
  }

  async function exportRanking(kind: 'excel' | 'pdf') {
    setBusy(kind)
    setExportError(null)
    try {
      const generatedAt = new Date()
      if (kind === 'excel') {
        const { buildRankingWorkbook } = await import('./rankingExcel')
        const buffer = await buildRankingWorkbook(rows, generatedAt).xlsx.writeBuffer()
        downloadBlob(new Blob([buffer], { type: XLSX_MIME }), rankingFileName('xlsx', generatedAt))
      } else {
        const { buildRankingPdf } = await import('./rankingPdf')
        buildRankingPdf(rows, generatedAt).save(rankingFileName('pdf', generatedAt))
      }
    } catch {
      setExportError('No se pudo generar el reporte. Intentá de nuevo.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card className="space-y-4">
      <CardHeader>
        <div>
          <CardTitle>Cobertura de rutas</CardTitle>
          <CardDescription>Todas las rutas de la unidad, de menor a mayor avance. Tocá una ruta para verla</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void exportRanking('excel')} disabled={busy !== null}>
            <FileSpreadsheet aria-hidden="true" />
            {busy === 'excel' ? 'Generando…' : 'Excel'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void exportRanking('pdf')} disabled={busy !== null}>
            <FileText aria-hidden="true" />
            {busy === 'pdf' ? 'Generando…' : 'PDF'}
          </Button>
        </div>
      </CardHeader>

      {rows.length === 0 ? (
        <EmptyState title="La unidad no tiene rutas" detail="No hay rutas registradas con los filtros actuales." />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Kpi label="Rutas" value={formatNumber(kpis.rutas)} />
            <Kpi label="Completas (90 % o más)" value={formatNumber(kpis.completas)} color={TRAFFIC_COLORS.verde} />
            <Kpi label="En curso" value={formatNumber(kpis.enCurso)} color={TRAFFIC_COLORS.amarillo} />
            <Kpi label="Sin iniciar" value={formatNumber(kpis.sinIniciar)} color={TRAFFIC_COLORS.gris} />
            <Kpi label="Pendientes totales" value={formatNumber(kpis.pendientes)} color={TRAFFIC_COLORS.rojo} />
          </dl>

          <ul className="flex flex-wrap gap-4 text-xs font-semibold text-muted-fg" aria-label="Semáforo de avance">
            {(Object.keys(TRAFFIC_LABELS) as Array<keyof typeof TRAFFIC_LABELS>).map((light) => (
              <li key={light} className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full" style={{ background: TRAFFIC_COLORS[light] }} aria-hidden="true" />
                {TRAFFIC_LABELS[light]}
              </li>
            ))}
          </ul>

          {exportError ? (
            <p role="alert" className="text-xs font-semibold text-danger">
              {exportError}
            </p>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-muted-fg">Las rutas más atrasadas</p>
              <ResponsiveContainer width="100%" height={Math.max(180, worst.length * 28 + 20)}>
                <BarChart data={worst} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis type="category" dataKey="label" width={96} {...AXIS_PROPS} />
                  <Tooltip {...TOOLTIP_PROPS} formatter={(value) => `${Number(value).toFixed(1)} %`} />
                  <Bar dataKey="avancePct" name="Avance" radius={[0, 4, 4, 0]} barSize={14} {...chartAnimation(reduced)}>
                    {worst.map((item) => (
                      <Cell key={item.label} fill={item.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="lg:col-span-3 space-y-3">
              <div className="sm:w-72">
                <Input
                  aria-label="Buscar ruta por filial, zona o ruta"
                  placeholder="Filial, zona o ruta"
                  icon={<Search className="size-4" aria-hidden="true" />}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <div className="max-h-[360px] overflow-auto">
                <table className="w-full border-collapse text-sm">
                  <thead className="sticky top-0 bg-surface">
                    <tr className="text-left text-[10px] font-bold uppercase tracking-[0.08em] text-muted-fg">
                      <th className="border-b border-border-subtle px-2 py-2">Semáforo</th>
                      {COLUMNS.map((column) => (
                        <th
                          key={column.key}
                          className={cn('border-b border-border-subtle px-2 py-2 whitespace-nowrap', column.numeric && 'text-right')}
                          aria-sort={
                            sort.key === column.key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'
                          }
                        >
                          <button
                            type="button"
                            onClick={() => toggleSort(column)}
                            className="inline-flex items-center gap-1 uppercase tracking-[0.08em] hover:text-primary"
                          >
                            {column.label}
                            {sort.key === column.key ? (
                              sort.direction === 'asc' ? (
                                <ArrowUp className="size-3" aria-hidden="true" />
                              ) : (
                                <ArrowDown className="size-3" aria-hidden="true" />
                              )
                            ) : null}
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.map((row) => {
                      const light = trafficLight(row)
                      return (
                        <tr
                          key={`${row.filial}-${row.zona}-${row.ruta}`}
                          tabIndex={0}
                          className="cursor-pointer transition-colors hover:bg-surface-2/70 focus-visible:bg-surface-2/70 focus-visible:outline-none"
                          onClick={() => onSelectRoute({ filial: row.filial, zona: row.zona, ruta: row.ruta })}
                          onKeyDown={(event) => {
                            if (event.key !== 'Enter' && event.key !== ' ') return
                            event.preventDefault()
                            onSelectRoute({ filial: row.filial, zona: row.zona, ruta: row.ruta })
                          }}
                        >
                          <td className="border-b border-border-subtle px-2 py-2 text-xs">
                            <span className="inline-flex items-center gap-1.5 font-semibold text-fg">
                              <span className="size-2.5 rounded-full" style={{ background: TRAFFIC_COLORS[light] }} aria-hidden="true" />
                              {TRAFFIC_LABELS[light]}
                            </span>
                          </td>
                          <td className="border-b border-border-subtle px-2 py-2 text-xs font-semibold text-fg">{routeName(row)}</td>
                          <td className="border-b border-border-subtle px-2 py-2 text-right text-xs tabular-nums">{row.cuentasRuta}</td>
                          <td className="border-b border-border-subtle px-2 py-2 text-right text-xs tabular-nums">{row.trabajadas}</td>
                          <td className="border-b border-border-subtle px-2 py-2 text-right text-xs tabular-nums">{row.pendientes}</td>
                          <td className="border-b border-border-subtle px-2 py-2 text-right text-xs tabular-nums">{row.avancePct.toFixed(1)} %</td>
                          <td className="border-b border-border-subtle px-2 py-2 text-right text-xs tabular-nums">{row.usuarios}</td>
                          <td className="border-b border-border-subtle px-2 py-2 text-xs text-muted-fg">
                            {row.ultimaActividad ? formatDateTime(row.ultimaActividad) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {table.length === 0 ? <EmptyState title="Ninguna ruta coincide con la búsqueda" /> : null}
              </div>
            </div>
          </div>
        </>
      )}
    </Card>
  )
}

function Kpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-2/50 p-3">
      <dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-fg">{label}</dt>
      <dd className="mt-1 text-2xl font-extrabold tabular-nums text-fg" style={color ? { color } : undefined}>
        {value}
      </dd>
    </div>
  )
}
