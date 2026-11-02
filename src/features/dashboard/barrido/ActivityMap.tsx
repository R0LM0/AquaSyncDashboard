import L from 'leaflet'
import { useCallback, useEffect, useRef, useState } from 'react'
import { GeoJSON, MapContainer, TileLayer, useMap } from 'react-leaflet'
import type { GeoJsonObject } from 'geojson'
import { useDashboardApi } from '@/app/dashboardApiContext'
import type { PredioLayerProperties, SucursalLayerProperties, UgestionLayerProperties } from '@/domain/types'
import 'leaflet/dist/leaflet.css'
import { cn } from '@/lib/utils'
import { BASE_LAYERS, NICARAGUA_BBOX, NICARAGUA_CENTER } from '../map/mapLayers'
import { EmptyState } from '../EmptyState'
import { FullscreenButton } from '../map/FullscreenButton'
import { MapLayersPopover } from '../map/MapLayersPopover'
import { readMapPreferences, saveMapPreferences, type BaseMap, type MapPreferences } from '../map/mapPreferences'
import { PREDIO_ESTADOS_ORDER, PREDIO_ESTADO_STYLES, estadoOfProperties, predioPathStyle } from '../map/predioStyle'
import { bboxOfBounds, predioPopupLines, prediosHint, type LayerKey, type MapView } from '../map/mapView'
import { useMapLayers } from '../map/useMapLayers'
import { escapeHtml } from '../coverage/coverageLayers'

export interface ActivityMapPoint {
  id: string
  lat: number
  lng: number
  color: string
  /** Surveys and registrations are solid dots; the pending accounts are hollow rings. */
  kind: 'registro' | 'pendiente'
  popup: string
  /** referenciaId of a Barrido survey: its popup offers the detail. */
  surveyId?: string
}

/** A request to show one point: the map flies to it and opens its popup. */
export interface ActivityFocus {
  id: string
  /** Changes on every request, so the same point can be focused twice. */
  nonce: number
}

export interface PendingToggle {
  on: boolean
  busy: boolean
  /** Pending accounts loaded for the assignment, once known. */
  count: number | null
  /** Of those, how many have no coordinates and so cannot be drawn. */
  withoutLocation?: number
  onToggle: () => void
}

const LOCATE_ZOOM = 16
/** Past this many points Leaflet draws on a canvas: thousands of SVG circles make the map sluggish. */
const CANVAS_FROM = 1500

function ActivityMarkers({
  points,
  focus,
  onOpenSurvey,
}: {
  points: ActivityMapPoint[]
  focus: ActivityFocus | null
  onOpenSurvey?: (id: string) => void
}) {
  const map = useMap()
  const markers = useRef(new Map<string, L.CircleMarker>())
  const openSurvey = useRef(onOpenSurvey)
  useEffect(() => {
    openSurvey.current = onOpenSurvey
  }, [onOpenSurvey])

  useEffect(() => {
    const group = L.layerGroup().addTo(map)
    const registry = new Map<string, L.CircleMarker>()

    for (const point of points) {
      const ring = point.kind === 'pendiente'
      const marker = L.circleMarker([point.lat, point.lng], {
        radius: ring ? 5 : 6,
        color: point.color,
        fillColor: point.color,
        fillOpacity: ring ? 0 : 0.85,
        weight: ring ? 2 : 1,
        dashArray: ring ? '2 3' : undefined,
      })
      marker.bindPopup(point.popup, { maxWidth: 260 })
      // Leaflet rebuilds the popup on each open: the locate button gets its listener then.
      marker.on('popupopen', (event: L.PopupEvent) => {
        const button = event.popup.getElement()?.querySelector<HTMLButtonElement>('[data-action="locate"]')
        const survey = event.popup.getElement()?.querySelector<HTMLButtonElement>('[data-action="survey"]')
        if (point.surveyId) survey?.addEventListener('click', () => openSurvey.current?.(point.surveyId as string), { once: true })
        button?.addEventListener('click', () => map.flyTo([point.lat, point.lng], Math.max(map.getZoom(), LOCATE_ZOOM)), {
          once: true,
        })
      })
      marker.addTo(group)
      registry.set(point.id, marker)
    }

    markers.current = registry

    // The lots layer is added after the points (and again on every pan) and, drawn later, would sit on top of
    // them and swallow their clicks, in SVG and in canvas mode alike. Keep the points last in the draw order.
    let timer: ReturnType<typeof setTimeout> | undefined
    let scheduled = false
    const raise = () => {
      scheduled = false
      for (const marker of registry.values()) marker.bringToFront()
    }
    const onLayerAdd = (event: L.LayerEvent) => {
      if (scheduled || !(event.layer instanceof L.Path) || event.layer instanceof L.CircleMarker) return
      scheduled = true
      timer = setTimeout(raise, 0)
    }
    map.on('layeradd', onLayerAdd)

    return () => {
      map.off('layeradd', onLayerAdd)
      clearTimeout(timer)
      group.remove()
      markers.current = new Map()
    }
  }, [map, points])

  useEffect(() => {
    if (!focus) return
    const marker = markers.current.get(focus.id)
    if (!marker) return
    map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), LOCATE_ZOOM))
    marker.openPopup()
  }, [map, focus])

  return null
}

/** Frames every point once per `fitKey`: a live refresh of the same view must not move the map. */
function FitToPoints({ points, fitKey }: { points: ActivityMapPoint[]; fitKey: string }) {
  const map = useMap()
  const framed = useRef<string | null>(null)

  useEffect(() => {
    if (points.length === 0 || framed.current === fitKey) return
    framed.current = fitKey
    map.fitBounds(L.latLngBounds(points.map((point): [number, number] => [point.lat, point.lng])), {
      padding: [24, 24],
      maxZoom: 16,
    })
  }, [map, points, fitKey])

  return null
}

const UGESTION_STYLE = {
  color: 'hsl(var(--primary) / 0.75)',
  weight: 1.4,
  fillColor: 'hsl(var(--primary) / 0.08)',
  fillOpacity: 1,
}

const SUCURSAL_STYLE = {
  color: 'hsl(var(--accent) / 0.8)',
  weight: 1.4,
  dashArray: '6 5',
  fillColor: 'hsl(var(--accent) / 0.05)',
  fillOpacity: 1,
}

/** Reports the settled view so the lots layer loads for that box (same contract as the cadastral map). */
function ViewReporter({ onViewChange }: { onViewChange: (view: MapView) => void }) {
  const map = useMap()

  useEffect(() => {
    const report = () => onViewChange({ bbox: bboxOfBounds(map.getBounds()), zoom: Math.round(map.getZoom()) })
    map.on('moveend', report)
    report()
    return () => {
      map.off('moveend', report)
    }
  }, [map, onViewChange])

  return null
}

const layerIds = new WeakMap<object, number>()
let nextLayerId = 0

/**
 * A key that changes with every response. react-leaflet's GeoJSON never updates its data, so the layer has to be
 * remounted per response: the old key (feature count + zoom) repeated itself whenever the API answered its
 * 3,000-lot cap twice at the same zoom, and the lots of the first view stayed on screen while the user panned.
 */
export function layerKey(collection: object): number {
  let id = layerIds.get(collection)
  if (id === undefined) {
    id = ++nextLayerId
    layerIds.set(collection, id)
  }
  return id
}

const DEFAULT_VIEW: MapView = { bbox: NICARAGUA_BBOX, zoom: 7 }

function sameView(left: MapView, right: MapView): boolean {
  return (
    left.zoom === right.zoom &&
    Math.abs(left.bbox.minLng - right.bbox.minLng) < 0.00005 &&
    Math.abs(left.bbox.minLat - right.bbox.minLat) < 0.00005 &&
    Math.abs(left.bbox.maxLng - right.bbox.maxLng) < 0.00005 &&
    Math.abs(left.bbox.maxLat - right.bbox.maxLat) < 0.00005
  )
}

export interface ActivityMapProps {
  points: ActivityMapPoint[]
  fitKey: string
  legend: Array<{ label: string; color: string }>
  focus: ActivityFocus | null
  pending?: PendingToggle
  emptyTitle: string
  emptyDetail: string
  ariaLabel: string
  /** Scope and period of the page: the administrative layers and the lots follow them. */
  ugestionId?: string
  sucursalId?: string
  desde?: string
  hasta?: string
  /** Opens the detail of a survey (Barrido popups). */
  onOpenSurvey?: (id: string) => void
}

/**
 * Activity points over the same base maps and layers as the cadastral map (units, branches, lots) with the
 * same layer control; the legend lists the device colours, the pending ring and the lot states.
 */
export function ActivityMap({
  points,
  fitKey,
  legend,
  focus,
  pending,
  emptyTitle,
  emptyDetail,
  ariaLabel,
  ugestionId,
  sucursalId,
  desde,
  hasta,
  onOpenSurvey,
}: ActivityMapProps) {
  const api = useDashboardApi()
  const [preferences, setPreferences] = useState<MapPreferences>(() => readMapPreferences())
  const [view, setView] = useState<MapView>(DEFAULT_VIEW)
  const [legendOpen, setLegendOpen] = useState(true)

  const layers = useMapLayers({
    api,
    ugestionId,
    sucursalId,
    desde,
    hasta,
    view,
    prediosEnabled: preferences.visible.predios,
  })

  const handleViewChange = useCallback((next: MapView) => {
    setView((current) => (sameView(current, next) ? current : next))
  }, [])

  const update = useCallback((next: MapPreferences) => {
    setPreferences(next)
    saveMapPreferences(next)
  }, [])

  const toggleLayer = useCallback(
    (key: LayerKey) => update({ ...preferences, visible: { ...preferences.visible, [key]: !preferences.visible[key] } }),
    [preferences, update],
  )
  const changeBaseMap = useCallback((baseMap: BaseMap) => update({ ...preferences, baseMap }), [preferences, update])

  const tiles = BASE_LAYERS[preferences.baseMap]
  const visible = preferences.visible
  const hint = visible.predios ? prediosHint(view.zoom, layers.truncated, layers.predios?.message) : null
  const hasPending = points.some((point) => point.kind === 'pendiente')

  return (
    <div className="space-y-2">
      {pending ? (
        <button
          type="button"
          aria-pressed={pending.on}
          disabled={pending.busy}
          onClick={pending.onToggle}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-60',
            pending.on ? 'border-border-subtle text-fg' : 'border-dashed border-border-subtle text-muted-fg',
          )}
        >
          <span className="size-2.5 rounded-full border-2 border-dashed border-muted-fg" aria-hidden="true" />
          {pending.busy
            ? 'Cargando pendientes…'
            : pending.on && pending.count !== null
              ? `Cuentas pendientes (${pending.count})`
              : 'Mostrar cuentas pendientes'}
        </button>
      ) : null}
      {pending?.on && pending.withoutLocation ? (
        <p role="status" className="text-xs font-semibold text-muted-fg" data-testid="pending-no-location">
          {pending.withoutLocation === 1
            ? '1 cuenta pendiente sin ubicación'
            : `${pending.withoutLocation} cuentas pendientes sin ubicación`}
        </p>
      ) : null}

      {points.length === 0 ? (
        <EmptyState title={emptyTitle} detail={emptyDetail} />
      ) : (
        <div
          className="map-shell relative isolate z-0 h-[60vh] min-h-[420px] overflow-hidden rounded-xl border border-border-subtle md:h-[70vh] md:min-h-[520px]"
          role="group"
          aria-label={ariaLabel}
          data-testid="activity-map"
        >
          <MapContainer
            center={NICARAGUA_CENTER}
            zoom={12}
            scrollWheelZoom
            preferCanvas={points.length > CANVAS_FROM}
            className="h-full w-full"
          >
            <TileLayer key={preferences.baseMap} url={tiles.url} attribution={tiles.attribution} />
            <ViewReporter onViewChange={handleViewChange} />
            <FitToPoints points={points} fitKey={fitKey} />
            <div className="absolute right-3 top-3 z-[800]">
              <FullscreenButton />
            </div>

            {visible.ugestiones && layers.ugestiones ? (
              <GeoJSON
                key={`ugestiones-${layers.ugestiones.collection.features.length}`}
                data={layers.ugestiones.collection as unknown as GeoJsonObject}
                style={UGESTION_STYLE}
                onEachFeature={(feature, layer) => {
                  const nombre = String((feature.properties as UgestionLayerProperties | null)?.nombre ?? '')
                  layer.bindTooltip(escapeHtml(nombre), { sticky: true })
                }}
              />
            ) : null}

            {visible.sucursales && layers.sucursales ? (
              <GeoJSON
                key={`sucursales-${layers.sucursales.collection.features.length}`}
                data={layers.sucursales.collection as unknown as GeoJsonObject}
                style={SUCURSAL_STYLE}
                onEachFeature={(feature, layer) => {
                  const nombre = String((feature.properties as SucursalLayerProperties | null)?.nombre ?? '')
                  layer.bindTooltip(escapeHtml(nombre), { sticky: true })
                }}
              />
            ) : null}

            {visible.predios && layers.predios ? (
              <GeoJSON
                key={`predios-${layerKey(layers.predios.collection)}`}
                data={layers.predios.collection as unknown as GeoJsonObject}
                style={(feature) =>
                  predioPathStyle(estadoOfProperties(feature?.properties as Partial<PredioLayerProperties> | undefined))
                }
                onEachFeature={(feature, layer) => {
                  const properties = feature.properties as PredioLayerProperties | null
                  if (!properties) return
                  const html = predioPopupLines(properties)
                    .map(([label, value]) => `<div><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</div>`)
                    .join('')
                  layer.bindPopup(`<div class="predio-popup">${html}</div>`, { maxWidth: 260 })
                }}
              />
            ) : null}

            {visible.cambios ? <ActivityMarkers points={points} focus={focus} onOpenSurvey={onOpenSurvey} /> : null}
          </MapContainer>

          <div className="absolute right-3 top-[56px] z-[800]">
            <MapLayersPopover
              baseMap={preferences.baseMap}
              onBaseMapChange={changeBaseMap}
              visible={visible}
              onToggleLayer={toggleLayer}
              zoom={view.zoom}
            />
          </div>

          {hint ? (
            <p
              className="absolute bottom-3 left-1/2 z-[700] -translate-x-1/2 rounded-full border border-accent/40 bg-accent/15 px-3 py-1.5 text-[11px] font-bold text-accent shadow-panel backdrop-blur"
              role="status"
            >
              {hint}
            </p>
          ) : null}

          <div className="absolute bottom-3 left-3 z-[800]" data-testid="activity-legend">
            {legendOpen ? (
              <div className="rounded-xl border border-border-subtle bg-surface/92 px-2.5 py-2 shadow-panel backdrop-blur">
                <button
                  type="button"
                  onClick={() => setLegendOpen(false)}
                  className="mb-1 flex w-full items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-fg hover:text-fg"
                  aria-expanded
                >
                  Leyenda
                </button>
                <ul className="flex flex-col gap-1 text-[10px] font-semibold text-muted-fg" aria-label="Dispositivos del mapa">
                  {legend.map((item) => (
                    <li key={item.label} className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full" style={{ background: item.color }} aria-hidden="true" />
                      {item.label}
                    </li>
                  ))}
                  {hasPending ? (
                    <li className="flex items-center gap-1.5">
                      <span
                        className="size-2 rounded-full border-2 border-dashed border-muted-fg"
                        aria-hidden="true"
                      />
                      Cuenta pendiente
                    </li>
                  ) : null}
                </ul>
                {visible.predios ? (
                  <section className="mt-2 border-t border-border-subtle pt-1.5" aria-label="Predios">
                    <h3 className="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-fg">Predios</h3>
                    <ul className="flex flex-col gap-1 text-[10px] font-semibold text-muted-fg">
                      {PREDIO_ESTADOS_ORDER.map((estado) => (
                        <li key={estado} className="flex items-center gap-1.5">
                          <span
                            className="size-2.5 rounded-sm border"
                            style={{
                              background: PREDIO_ESTADO_STYLES[estado].fill,
                              borderColor: PREDIO_ESTADO_STYLES[estado].stroke,
                            }}
                            aria-hidden="true"
                          />
                          {PREDIO_ESTADO_STYLES[estado].label}
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setLegendOpen(true)}
                className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-surface/92 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-fg shadow-panel backdrop-blur hover:text-fg"
                aria-expanded={false}
              >
                Leyenda
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
