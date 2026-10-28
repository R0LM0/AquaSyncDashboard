import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useDashboardApi } from '../../app/dashboardApiContext'
import { environmentLabel, isNonProductionMode } from '../../app/createDashboardApi'
import { Panel } from '../../components/Panel'
import { Skeleton } from '../../components/Skeleton'
import { sanitizeFilters } from '../../domain/catalogs'
import { errorMessage, isSessionExpired } from '../../domain/errors'
import { applyLiveDelta, liveDeltaSince, livePointsSince } from '../../domain/live'
import type { Filters, Session } from '../../domain/types'
import { lastDaysRange } from '../../shared/dates'
import { formatDayKey } from '../../shared/format'
import { KpiCards } from './kpis/KpiCards'
import { FilterBar } from './filters/FilterBar'
import { filtersToQuery, readFiltersFromLocation } from './filters/filtersUrl'
import { ChangesMap, DailyActivityChart, RouteProgressChart, UserRankingChart } from './lazy'
import { MapLegend } from './map/MapLegend'
import { ChangesTable } from './tables/ChangesTable'
import { UserRouteTable } from './tables/UserRouteTable'
import { buildChangeSheet, buildSummarySheet, filtersSummaryText } from './export/exportRows'
import { LiveFeed } from './live/LiveFeed'
import { useChangesPage, useDashboardData, useRefreshToken } from './useDashboardData'
import { useLiveChanges } from './useLiveChanges'

const PAGE_SIZE = 15
const DAYS_IN_RANGE = 30

export interface DashboardPageProps {
  session: Session
  onLogout: () => void
}

export function DashboardPage({ session, onLogout }: DashboardPageProps) {
  const api = useDashboardApi()
  const defaultRange = useMemo(() => lastDaysRange(DAYS_IN_RANGE), [])
  const [filters, setFilters] = useState<Filters>(() =>
    readFiltersFromLocation(window.location, defaultRange),
  )
  const [pageNumber, setPageNumber] = useState(1)
  const [refreshToken, bumpRefresh] = useRefreshToken()
  const [exporting, setExporting] = useState(false)
  const [notice, setNotice] = useState('')

  const data = useDashboardData(api, filters, refreshToken, onLogout)
  const changes = useChangesPage(api, filters, pageNumber, PAGE_SIZE, refreshToken, onLogout)
  const live = useLiveChanges({ api, filters, onRefresh: bumpRefresh })

  const catalogs = data.data?.catalogs

  // Only changes received after the last authoritative load add to the counters:
  // the loaded numbers already include everything registered before it.
  const known = useMemo(
    () => ({
      cuentas: new Set((data.data?.points ?? []).map((point) => point.cuenta)),
      usuarios: new Set((data.data?.progress ?? []).map((row) => row.usuario)),
    }),
    [data.data],
  )
  const delta = useMemo(
    () => liveDeltaSince(live.feed, data.loadedAt, known),
    [live.feed, data.loadedAt, known],
  )
  const summary = useMemo(
    () => (data.data ? applyLiveDelta(data.data.summary, delta) : undefined),
    [data.data, delta],
  )

  // A live change shows up on the map before the next authoritative refresh.
  const points = useMemo(() => {
    const livePoints = livePointsSince(live.feed, data.loadedAt)
    if (livePoints.length === 0) return data.data?.points ?? []

    const byCuenta = new Map((data.data?.points ?? []).map((point) => [point.cuenta, point]))
    for (const point of livePoints) byCuenta.set(point.cuenta, point)
    return [...byCuenta.values()]
  }, [live.feed, data.loadedAt, data.data])

  // Filters live in the URL query string so a view can be shared or reloaded.
  useEffect(() => {
    const next = `${window.location.pathname}${filtersToQuery(filters)}`
    const current = `${window.location.pathname}${window.location.search}`
    if (next !== current) window.history.replaceState(null, '', next)
  }, [filters])

  useEffect(() => {
    const onPopState = () => setFilters(readFiltersFromLocation(window.location, defaultRange))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [defaultRange])

  // The pulse is pure CSS (it fades out and keeps forwards), so the highlight
  // needs no state, no timer and no extra render.
  const latestLive = live.feed[0]
  const highlight =
    latestLive && latestLive.lat !== undefined && latestLive.lng !== undefined
      ? { lat: latestLive.lat, lng: latestLive.lng, id: latestLive.id }
      : null

  const handleFilterChange = useCallback(
    (patch: Partial<Filters>) => {
      setPageNumber(1)
      setFilters((current) => {
        const merged = { ...current, ...patch }
        return catalogs ? sanitizeFilters(merged, catalogs) : merged
      })
    },
    [catalogs],
  )

  const handleReset = useCallback(() => {
    setPageNumber(1)
    setFilters({ ...defaultRange })
  }, [defaultRange])

  const handleExport = useCallback(async () => {
    setExporting(true)
    setNotice('')
    try {
      // xlsx is heavy and only needed on click, so it loads on demand.
      const [excel, allChanges, currentSummary] = await Promise.all([
        import('./export/exportExcel'),
        api.allChanges(filters),
        api.summary(filters),
      ])
      excel.downloadWorkbook(
        [buildSummarySheet(currentSummary, filters), buildChangeSheet(allChanges)],
        excel.exportFilename(filters),
      )
    } catch (error) {
      if (isSessionExpired(error)) {
        onLogout()
        return
      }
      setNotice(errorMessage(error, 'No se pudo generar el Excel'))
    } finally {
      setExporting(false)
    }
  }, [api, filters, onLogout])

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__brand">
          <h1>SIGIL · Seguimiento catastral</h1>
          <p>
            ENACAL · Trabajo de campo con AquaSync · {formatDayKey(filters.desde)} a{' '}
            {formatDayKey(filters.hasta)}
          </p>
        </div>

        <div className="app-header__aside no-print">
          {isNonProductionMode() ? (
            <span className="badge badge--test" data-testid="environment-badge">
              {environmentLabel()}
            </span>
          ) : null}
          <span className="app-header__user">{session.nombre}</span>
          <button type="button" className="button button--ghost" onClick={onLogout}>
            Salir
          </button>
        </div>
      </header>

      <FilterBar
        filters={filters}
        catalogs={
          catalogs ?? {
            ugestiones: [],
            sucursales: [],
            filiales: [],
            zonas: [],
            rutas: [],
            usuarios: [],
          }
        }
        onChange={handleFilterChange}
        onReset={handleReset}
      />

      {data.status === 'error' ? (
        <p className="alert alert--error" role="alert">
          {data.error}{' '}
          <button type="button" className="button button--ghost" onClick={bumpRefresh}>
            Reintentar
          </button>
        </p>
      ) : null}

      {notice ? (
        <p className="alert alert--error" role="alert">
          {notice}
        </p>
      ) : null}

      {summary ? (
        <KpiCards summary={summary} />
      ) : (
        <p className="empty" data-testid="loading">
          Cargando información…
        </p>
      )}

      <div className="grid grid--2">
        <Panel
          title="Progreso por ruta"
          description="Cuentas trabajadas sobre el total de la ruta"
        >
          <Suspense fallback={<Skeleton height={300} label="Cargando gráfico de progreso" />}>
            <RouteProgressChart progress={data.data?.progress ?? []} />
          </Suspense>
        </Panel>
        <LiveFeed
          items={live.feed}
          status={live.status}
          paused={live.paused}
          onTogglePaused={live.togglePaused}
        />
      </div>

      <div className="grid grid--2">
        <Panel title="Actividad diaria" description="Cambios por día y tipo de cambio">
          <Suspense fallback={<Skeleton height={300} label="Cargando gráfico de actividad" />}>
            <DailyActivityChart daily={data.data?.daily ?? []} />
          </Suspense>
        </Panel>
        <Panel title="Ranking de usuarios" description="Cambios registrados por usuario">
          <Suspense fallback={<Skeleton height={300} label="Cargando ranking de usuarios" />}>
            <UserRankingChart daily={data.data?.daily ?? []} />
          </Suspense>
        </Panel>
      </div>

      <Panel
        title="Mapa de Nicaragua"
        description={filtersSummaryText(filters)}
        actions={<MapLegend />}
        className="panel--map"
      >
        <Suspense fallback={<Skeleton height={420} label="Cargando mapa" />}>
          <ChangesMap points={points} highlight={highlight} />
        </Suspense>
      </Panel>

      <Panel
        title="Avance por usuario y ruta"
        description="Ordená por cualquier columna"
        actions={
          <div className="panel__actions no-print">
            <button
              type="button"
              className="button button--primary"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? 'Generando…' : 'Exportar Excel'}
            </button>
            <button type="button" className="button button--ghost" onClick={() => window.print()}>
              Imprimir / PDF
            </button>
          </div>
        }
      >
        <UserRouteTable progress={data.data?.progress ?? []} />
      </Panel>

      <Panel title="Detalle de cambios" description="Últimos cambios registrados en SIGIL">
        <ChangesTable
          page={changes.page}
          pageNumber={pageNumber}
          pageSize={PAGE_SIZE}
          onPageChange={setPageNumber}
          error={changes.error}
        />
      </Panel>
    </div>
  )
}
