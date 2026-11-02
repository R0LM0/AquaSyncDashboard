import { useCallback, useMemo, useRef, useState } from 'react'
import { MapPin, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { Filters, ServicioNuevoRegistro } from '@/domain/types'
import type { DashboardApi } from '@/ports/DashboardApi'
import { formatDateTime, formatNumber } from '@/shared/format'
import { downloadBlob } from '../report/download'
import { EmptyState } from '../EmptyState'
import { ActivityMap, type ActivityFocus, type ActivityMapPoint } from '../barrido/ActivityMap'
import { buildPopup } from '../barrido/activityPopup'
import { DayChart, DeviceTable, ExportButtons, Kpi, TD, THEAD, THEAD_ROW, Th } from '../barrido/ActivityParts'
import { activityFileName, aliasColor, collectAliases, filterRegistros, hasLocation, limitRows } from '../barrido/activity'
import { useActivityRefresh, useActivityResource } from '../barrido/useActivityResource'

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export interface ServiciosPanelProps {
  api: DashboardApi
  filters: Filters
  onSessionExpired: () => void
}

/** Servicios nuevos: what the phones registered, by day, device and estado, with a map. */
export function ServiciosPanel({ api, filters, onSessionExpired }: ServiciosPanelProps) {
  const refreshToken = useActivityRefresh(api, 'servicio_nuevo')
  const filtersKey = JSON.stringify(filters)
  const [query, setQuery] = useState('')
  const [focus, setFocus] = useState<ActivityFocus | null>(null)
  const nonce = useRef(0)
  const mapRef = useRef<HTMLDivElement | null>(null)
  const [busy, setBusy] = useState<'excel' | 'pdf' | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  const resource = useActivityResource({
    key: filtersKey,
    load: useCallback((signal: AbortSignal) => api.serviciosNuevos(JSON.parse(filtersKey) as Filters, signal), [api, filtersKey]),
    fallbackError: 'No se pudieron cargar los servicios nuevos',
    onSessionExpired,
    refreshToken,
  })

  const data = resource.data
  const order = useMemo(() => collectAliases(data?.dispositivos ?? [], data?.porDia ?? [], data?.registros ?? []), [data])
  const table = useMemo(() => limitRows(filterRegistros(data?.registros ?? [], query)), [data, query])

  const points = useMemo<ActivityMapPoint[]>(
    () =>
      (data?.registros ?? []).filter(hasLocation).map((row) => ({
        id: `s-${row.id}`,
        lat: row.lat,
        lng: row.lng,
        color: aliasColor(row.alias, order),
        kind: 'registro',
        popup: buildPopup(
          row.cliente || `Servicio ${row.id}`,
          [row.estado, row.sucursal, `${row.alias}${row.modelo ? ` · ${row.modelo}` : ''}`, formatDateTime(row.fecha)],
          row.lat,
          row.lng,
        ),
      })),
    [data, order],
  )

  function locate(row: ServicioNuevoRegistro) {
    nonce.current += 1
    setFocus({ id: `s-${row.id}`, nonce: nonce.current })
    mapRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
  }

  async function exportReport(kind: 'excel' | 'pdf') {
    if (!data) return
    setBusy(kind)
    setExportError(null)
    try {
      const generatedAt = new Date()
      if (kind === 'excel') {
        const { buildServiciosWorkbook } = await import('./serviciosExcel')
        const buffer = await buildServiciosWorkbook(data, generatedAt).xlsx.writeBuffer()
        downloadBlob(new Blob([buffer], { type: XLSX_MIME }), activityFileName('Servicios-nuevos', 'xlsx', generatedAt))
      } else {
        const { buildServiciosPdf } = await import('./serviciosPdf')
        buildServiciosPdf(data, generatedAt).save(activityFileName('Servicios-nuevos', 'pdf', generatedAt))
      }
    } catch {
      setExportError('No se pudo generar el reporte. Intentá de nuevo.')
    } finally {
      setBusy(null)
    }
  }

  if (resource.status === 'idle' || resource.status === 'loading') {
    return (
      <div className="space-y-3" data-testid="servicios-loading">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    )
  }

  if (resource.status === 'error' || !data) {
    return (
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Servicios nuevos</CardTitle>
            <CardDescription>Registros de los celulares</CardDescription>
          </div>
        </CardHeader>
        <p role="alert" className="text-sm font-semibold text-danger">
          {resource.error ?? 'No se pudieron cargar los servicios nuevos'}
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <Card className="space-y-4">
        <CardHeader>
          <div>
            <CardTitle>Servicios nuevos</CardTitle>
            <CardDescription>Servicios registrados desde los celulares en el período</CardDescription>
          </div>
          <ExportButtons busy={busy} onExport={(kind) => void exportReport(kind)} />
        </CardHeader>

        {exportError ? (
          <p role="alert" className="text-xs font-semibold text-danger">
            {exportError}
          </p>
        ) : null}

        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Registrados" value={formatNumber(data.resumen.registrados)} />
          <Kpi label="Hoy" value={formatNumber(data.resumen.hoy)} />
          {data.resumen.porEstado.map((row) => (
            <Kpi key={row.estado} label={row.estado || 'Sin estado'} value={formatNumber(row.cantidad)} />
          ))}
        </dl>

        <div>
          <p className="mb-2 text-xs font-bold text-muted-fg">Registros por día y dispositivo</p>
          <DayChart porDia={data.porDia} order={order} emptyTitle="Sin servicios registrados en el período" />
        </div>

        <div>
          <p className="mb-2 text-xs font-bold text-muted-fg">Dispositivos</p>
          <DeviceTable devices={data.dispositivos} countLabel="Registros" order={order} />
        </div>
      </Card>

      <Card className="space-y-3">
        <CardHeader>
          <div>
            <CardTitle>Registros</CardTitle>
            <CardDescription>Del más reciente al más antiguo. Usá Ubicar para verlo en el mapa</CardDescription>
          </div>
        </CardHeader>

        {data.registros.length === 0 ? (
          <EmptyState title="No hay servicios registrados" detail="Probá con otro rango de fechas o menos filtros." />
        ) : (
          <>
            <div className="sm:w-72">
              <Input
                aria-label="Buscar servicio por cliente, usuario, estado o sucursal"
                placeholder="Cliente, usuario, estado o sucursal"
                icon={<Search className="size-4" aria-hidden="true" />}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div className="max-h-[360px] overflow-auto">
              <table className="w-full border-collapse text-sm">
                <caption className="sr-only">Servicios nuevos registrados</caption>
                <thead className={THEAD}>
                  <tr className={THEAD_ROW}>
                    <Th>Fecha</Th>
                    <Th>Usuario</Th>
                    <Th>Alias</Th>
                    <Th>Modelo</Th>
                    <Th>Estado</Th>
                    <Th>Sucursal</Th>
                    <Th>Cliente</Th>
                    <Th>Mapa</Th>
                  </tr>
                </thead>
                <tbody>
                  {table.shown.map((row) => (
                    <tr key={row.id}>
                      <td className={`${TD} whitespace-nowrap text-muted-fg`}>{formatDateTime(row.fecha)}</td>
                      <td className={`${TD} font-semibold text-fg`}>{row.usuario}</td>
                      <td className={TD}>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="size-2.5 rounded-full" style={{ background: aliasColor(row.alias, order) }} aria-hidden="true" />
                          {row.alias}
                        </span>
                      </td>
                      <td className={TD}>{row.modelo || '—'}</td>
                      <td className={TD}>{row.estado || '—'}</td>
                      <td className={TD}>{row.sucursal || '—'}</td>
                      <td className={TD}>{row.cliente || '—'}</td>
                      <td className={TD}>
                        {hasLocation(row) ? (
                          <Button variant="ghost" size="sm" onClick={() => locate(row)} aria-label={`Ubicar el servicio ${row.id} en el mapa`}>
                            <MapPin aria-hidden="true" />
                            Ubicar
                          </Button>
                        ) : (
                          <span className="text-muted-fg">Sin ubicación</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {table.shown.length === 0 ? <EmptyState title="Ningún servicio coincide con la búsqueda" /> : null}
            </div>
            {table.hidden > 0 ? (
              <p className="text-xs text-muted-fg">
                Se muestran {formatNumber(table.shown.length)} registros más recientes; {formatNumber(table.hidden)} más con la búsqueda o en el Excel.
              </p>
            ) : null}
          </>
        )}
      </Card>

      <Card className="space-y-3">
        <CardHeader>
          <div>
            <CardTitle>Mapa de servicios nuevos</CardTitle>
            <CardDescription>Cada punto es un servicio registrado, del color de su dispositivo</CardDescription>
          </div>
        </CardHeader>
        <div ref={mapRef}>
          <ActivityMap
            points={points}
            fitKey={filtersKey}
            legend={order.map((alias) => ({ label: alias, color: aliasColor(alias, order) }))}
            focus={focus}
            emptyTitle="Ningún servicio tiene ubicación"
            emptyDetail="Los puntos aparecen cuando un celular registra un servicio con coordenadas."
            ariaLabel="Mapa de servicios nuevos"
          />
        </div>
      </Card>
    </div>
  )
}
