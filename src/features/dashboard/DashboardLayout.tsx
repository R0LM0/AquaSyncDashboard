import * as Dialog from '@radix-ui/react-dialog'
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Outlet, useLocation, useSearchParams } from 'react-router-dom'
import { useDashboardApi } from '@/app/dashboardApiContext'
import { currentEnvironment } from '@/app/environment'
import {
  resolveRuntimeEnvironment,
  showsTestDataBand,
  type RuntimeEnvironment,
} from '@/app/runtimeEnvironment'
import { useTheme } from '@/app/theme'
import { Button } from '@/components/ui/button'
import { applyFilterPatch, scopedFilters } from '@/domain/cascade'
import { liveDeltaSince, livePointsSince } from '@/domain/live'
import type { Filters, Session } from '@/domain/types'
import { lastDaysRange } from '@/shared/dates'
import { cn } from '@/lib/utils'
import { filtersToParams, paramsToFilters } from './filters/filtersUrl'
import { useCascadeOptions } from './filters/useCascadeOptions'
import { SectionSkeleton } from './SectionSkeleton'
import { AccountPanel } from './account/AccountPanel'
import { Sidebar } from './Sidebar'
import { NAV_ITEMS, readSidebarCollapsed, saveSidebarCollapsed, sectionLabel } from './SidebarNav'
import { Topbar } from './Topbar'
import type { SectionContextValue } from './sectionContext'
import { useChangesPage, useDashboardData, useRefreshToken } from './useDashboardData'
import { useLiveChanges } from './useLiveChanges'
import { usePreviousSummary } from './usePreviousSummary'
import { useReportExport } from './report/useReportExport'

// The filter panel (searchable selects on a popover) is its own chunk: it keeps the entry small.
const FilterBar = lazy(() =>
  import('./filters/FilterBar').then((module) => ({ default: module.FilterBar })),
)

// Snapshot charts for the PDF: mounted only while a report is being built.
const ExportCharts = lazy(() =>
  import('./report/ExportCharts').then((module) => ({ default: module.ExportCharts })),
)

const PAGE_SIZE = 15
const DAYS_IN_RANGE = 30

export interface DashboardLayoutProps {
  session: Session
  onLogout: () => void
  environment?: RuntimeEnvironment
}

export function DashboardLayout({ session, onLogout, environment }: DashboardLayoutProps) {
  const runtimeEnvironment = environment ?? resolveRuntimeEnvironment(import.meta.env)
  const api = useDashboardApi()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const defaultRange = useMemo(() => lastDaysRange(DAYS_IN_RANGE), [])
  const search = searchParams.toString()
  // The scope is applied to every read of the URL: a restricted user never leaves its unidad.
  const filters = useMemo(
    () => scopedFilters(paramsToFilters(new URLSearchParams(search), defaultRange), session.alcance),
    [search, defaultRange, session.alcance],
  )

  const [pageNumber, setPageNumber] = useState(1)
  const [refreshToken, bumpRefresh] = useRefreshToken()
  const [collapsed, setCollapsed] = useState(() => readSidebarCollapsed())
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const chromeRef = useRef<HTMLDivElement | null>(null)
  const { theme, toggleTheme } = useTheme()

  // "Limpiar" and a 403 both go back to the scope of the user, never to the whole country.
  const resetFilters = useCallback(() => {
    setPageNumber(1)
    setSearchParams(filtersToParams(scopedFilters(defaultRange, session.alcance)), { replace: true })
  }, [defaultRange, session.alcance, setSearchParams])

  const data = useDashboardData(api, filters, refreshToken, onLogout, resetFilters)
  const cascade = useCascadeOptions(api, filters, onLogout)
  const changes = useChangesPage(api, filters, pageNumber, PAGE_SIZE, refreshToken, onLogout)
  const live = useLiveChanges({ api, filters, onRefresh: bumpRefresh })
  const previousSummary = usePreviousSummary(api, filters, refreshToken, onLogout)

  const report = useReportExport({
    api,
    filters,
    catalogs: data.data?.catalogs ?? {
      ugestiones: [],
      sucursales: [],
      filiales: [],
      zonas: [],
      rutas: [],
      usuarios: [],
    },
    summary: data.data?.summary ?? {
      cuentasTrabajadas: 0,
      fotosNuevas: 0,
      fotosActualizadas: 0,
      ubicaciones: 0,
      usuariosActivos: 0,
      avanceRutaPct: null,
    },
    progress: data.data?.progress ?? [],
    daily: data.data?.daily ?? [],
    usuario: session.usuario,
    environment: currentEnvironment(undefined, undefined, runtimeEnvironment).label,
    onSessionExpired: onLogout,
  })

  // The URL always carries the whole filter set, so a view is shareable as-is.
  // It runs only on a real section: rewriting the query while the index route is
  // still redirecting would cancel that redirect.
  const onSection = NAV_ITEMS.some((item) => location.pathname.startsWith(item.to))

  useEffect(() => {
    if (!onSection || searchParams.has('desde')) return
    setSearchParams(filtersToParams(filters), { replace: true })
  }, [filters, onSection, searchParams, setSearchParams])

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
  const summary = useMemo(() => {
    if (!data.data) return undefined
    return {
      ...data.data.summary,
      fotosNuevas: data.data.summary.fotosNuevas + delta.fotosNuevas,
      fotosActualizadas: data.data.summary.fotosActualizadas + delta.fotosActualizadas,
      ubicaciones: data.data.summary.ubicaciones + delta.ubicaciones,
      cuentasTrabajadas: data.data.summary.cuentasTrabajadas + delta.cuentasNuevas,
      usuariosActivos: data.data.summary.usuariosActivos + delta.usuariosNuevos,
    }
  }, [data.data, delta])

  const points = useMemo(() => {
    const livePoints = livePointsSince(live.feed, data.loadedAt)
    if (livePoints.length === 0) return data.data?.points ?? []

    const byCuenta = new Map((data.data?.points ?? []).map((point) => [point.cuenta, point]))
    for (const point of livePoints) byCuenta.set(point.cuenta, point)
    return [...byCuenta.values()]
  }, [live.feed, data.loadedAt, data.data])

  const latestLive = live.feed[0]
  const highlight =
    latestLive && latestLive.lat !== undefined && latestLive.lng !== undefined
      ? { lat: latestLive.lat, lng: latestLive.lng, id: latestLive.id }
      : null

  const catalogs = data.data?.catalogs
  const patchFilters = useCallback(
    (patch: Partial<Filters>) => {
      setPageNumber(1)
      setSearchParams(filtersToParams(applyFilterPatch(filters, patch, session.alcance)), { replace: true })
    },
    [filters, session.alcance, setSearchParams],
  )

  const openAccount = useCallback((cuenta: string) => setSelectedAccount(cuenta), [])
  const closeAccount = useCallback(() => setSelectedAccount(null), [])

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => {
      const next = !current
      saveSidebarCollapsed(next)
      return next
    })
  }, [])

  // Sections that fill the window need the real height of the chrome above them.
  useEffect(() => {
    const node = chromeRef.current
    if (!node) return

    const publish = () =>
      document.documentElement.style.setProperty('--app-chrome', `${node.offsetHeight}px`)

    publish()
    const observer = new ResizeObserver(publish)
    observer.observe(node)
    return () => {
      observer.disconnect()
      document.documentElement.style.removeProperty('--app-chrome')
    }
  }, [])

  const fitKey = JSON.stringify([
    filters.ugestionId,
    filters.sucursalId,
    filters.filial,
    filters.zona,
    filters.ruta,
    filters.usuario,
    filters.desde,
    filters.hasta,
    filters.tipoCambio,
  ])

  const context: SectionContextValue = {
    api,
    filters,
    alcance: session.alcance,
    data: data.data,
    loading: !data.data,
    error: data.error,
    previousSummary,
    points,
    changes: changes.page ?? { rows: [], total: 0 },
    changesError: changes.error,
    changesLoading: changes.status === 'loading' && !changes.page,
    pageNumber,
    pageSize: PAGE_SIZE,
    setPageNumber,
    live: { feed: live.feed, status: live.status, paused: live.paused, togglePaused: live.togglePaused },
    highlight,
    refresh: bumpRefresh,
    report: {
      busy: report.busy,
      warning: report.warning,
      error: report.error,
      exportReport: report.exportReport,
    },
    openAccount,
    fitKey,
  }

  const sidebar = (isDrawer: boolean) => (
    <Sidebar
      collapsed={isDrawer ? false : collapsed}
      onToggleCollapsed={toggleCollapsed}
      session={session}
      theme={theme}
      onToggleTheme={toggleTheme}
      onLogout={onLogout}
      onNavigate={isDrawer ? () => setMenuOpen(false) : undefined}
    />
  )

  return (
    <div className="min-h-screen bg-bg text-fg">
      {showsTestDataBand(runtimeEnvironment) ? (
        <p
          className="border-b border-warning/40 bg-warning/15 px-4 py-1.5 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-warning no-print"
          data-testid="test-data-band"
          role="status"
        >
          Estás viendo datos de pruebas
        </p>
      ) : null}

      <div className="flex min-h-screen">
        <aside
          className={cn('sticky top-0 hidden h-screen shrink-0 transition-[width] duration-200 lg:block no-print', {
            'w-[76px]': collapsed,
            'w-64': !collapsed,
          })}
        >
          {sidebar(false)}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div ref={chromeRef}>
            <Topbar
              title={sectionLabel(location.pathname)}
              environment={runtimeEnvironment}
              liveStatus={live.status}
              livePaused={live.paused}
              loading={data.status === 'loading'}
              onRefresh={bumpRefresh}
              onOpenMenu={() => setMenuOpen(true)}
            />

            <Suspense fallback={null}>
              <FilterBar
                filters={filters}
                options={{ ...cascade, usuarios: catalogs?.usuarios ?? [] }}
                alcance={session.alcance}
                onChange={patchFilters}
                onReset={resetFilters}
              />
            </Suspense>
          </div>

          {report.chartsActive ? (
            <Suspense fallback={null}>
              <ExportCharts
                daily={data.data?.daily ?? []}
                progress={data.data?.progress ?? []}
                onReady={report.onChartsReady}
              />
            </Suspense>
          ) : null}

          <main className="flex-1 px-3 py-4 sm:px-5">
            {data.error ? (
              <p
                role="alert"
                className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm font-medium text-danger"
              >
                <AlertTriangle className="size-4" aria-hidden="true" />
                {data.error}
                <Button type="button" variant="secondary" size="sm" onClick={bumpRefresh}>
                  Reintentar
                </Button>
              </p>
            ) : null}

            {report.warning ? (
              <p
                role="status"
                data-testid="report-warning"
                className="mb-3 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-sm font-medium text-accent"
              >
                {report.warning}
              </p>
            ) : null}

            {report.error ? (
              <p
                role="alert"
                className="mb-3 rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm font-medium text-danger"
              >
                {report.error}
              </p>
            ) : null}

            <Suspense fallback={<SectionSkeleton />}>
              <div className="animate-fade-in">
                <Outlet context={context} />
              </div>
            </Suspense>
          </main>
        </div>
      </div>

      {report.toast ? (
        <p
          role="status"
          data-testid="report-toast"
          className="fixed bottom-4 right-4 z-[800] rounded-xl border border-success/40 bg-success/12 px-4 py-2.5 text-sm font-bold text-success shadow-panel backdrop-blur data-[state=open]:animate-fade-in"
        >
          {report.toast}
        </p>
      ) : null}

      <AccountPanel
        cuenta={selectedAccount}
        open={Boolean(selectedAccount)}
        onClose={closeAccount}
        onSessionExpired={onLogout}
      />

      <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm lg:hidden" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-50 w-64 bg-surface shadow-panel focus:outline-none lg:hidden">
            <Dialog.Title className="sr-only">Menú lateral</Dialog.Title>
            {sidebar(true)}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {summary === undefined && !data.data ? null : null}
    </div>
  )
}
