import L from 'leaflet'
import { Maximize2, Minimize2, Target } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { GeoJSON, MapContainer, TileLayer, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import type { GeoJsonObject } from 'geojson'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { NICARAGUA_HOME } from '@/domain/alcance'
import { CHANGE_TYPE_COLORS, CHANGE_TYPE_LABELS } from '@/domain/labels'
import type {
  MapCenter,
  MapLayer,
  MapPoint,
  PredioLayerProperties,
  SucursalLayerProperties,
  UgestionLayerProperties,
} from '@/domain/types'
import { formatDateTime } from '@/shared/format'
import { cn } from '@/lib/utils'
import { BASE_LAYERS, NICARAGUA_BBOX } from './mapLayers'
import { MapLegend } from './MapLegend'
import { MapLayersPopover } from './MapLayersPopover'
import type { BaseMap } from './mapPreferences'
import { estadoOfProperties, predioPathStyle } from './predioStyle'
import {
  bboxOfBounds,
  DEFAULT_LAYER_VISIBILITY,
  NOOP,
  predioPopupLines,
  shouldRefit,
  type LayerKey,
  type MapView,
} from './mapView'

const icons = new Map<string, L.DivIcon>()

function markerIcon(color: string, live: boolean): L.DivIcon {
  const key = `${color}-${live ? 'live' : 'still'}`
  const cached = icons.get(key)
  if (cached) return cached

  const icon = L.divIcon({
    className: cn('map-pin', live && 'map-pin--live'),
    html: `<span style="background:${color}"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
  icons.set(key, icon)
  return icon
}

function clusterIcon(cluster: { getChildCount: () => number }): L.DivIcon {
  const count = cluster.getChildCount()
  const size = count > 40 ? 'large' : count > 10 ? 'medium' : 'small'

  return L.divIcon({
    html: `<div><span>${count}</span></div>`,
    className: `marker-cluster marker-cluster-${size}`,
    iconSize: L.point(40, 40),
  })
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function popupHtml(point: MapPoint): string {
  return [
    `<strong>Cuenta ${escapeHtml(point.cuenta)}</strong>`,
    escapeHtml(point.cliente),
    escapeHtml(CHANGE_TYPE_LABELS[point.tipoCambio]),
    `${escapeHtml(point.usuario)} · ${escapeHtml(formatDateTime(point.fecha))}`,
    '<em>Abrir el panel para ver el detalle</em>',
  ].join('<br/>')
}

/**
 * Markers are managed imperatively by account: a live event adds or updates only
 * its own marker, so the map never rebuilds the list and the DOM nodes of the
 * other accounts survive every refresh.
 */
function ClusterMarkers({
  points,
  liveAccount,
  onSelect,
}: {
  points: MapPoint[]
  liveAccount?: string
  onSelect: (cuenta: string) => void
}) {
  const groupRef = useRef<L.FeatureGroup | null>(null)
  const markers = useRef(new Map<string, L.Marker>())
  const appliedIcons = useRef(new Map<string, L.DivIcon>())
  const onSelectRef = useRef(onSelect)
  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  useEffect(() => {
    const group = groupRef.current
    if (!group) return

    const seen = new Set<string>()

    for (const point of points) {
      seen.add(point.cuenta)
      const live = point.cuenta === liveAccount
      const icon = markerIcon(CHANGE_TYPE_COLORS[point.tipoCambio], live)
      const existing = markers.current.get(point.cuenta)

      if (!existing) {
        const marker = L.marker([point.lat, point.lng], { icon })
        marker.bindPopup(popupHtml(point), { maxWidth: 260 })
        marker.on('click', () => onSelectRef.current(point.cuenta))
        markers.current.set(point.cuenta, marker)
        appliedIcons.current.set(point.cuenta, icon)
        group.addLayer(marker)
        continue
      }

      // Only the marker that actually changed is touched.
      const position = existing.getLatLng()
      if (position.lat !== point.lat || position.lng !== point.lng) {
        existing.setLatLng([point.lat, point.lng])
      }
      // `setIcon` would rebuild the DOM node even with the same icon object.
      if (appliedIcons.current.get(point.cuenta) !== icon) {
        existing.setIcon(icon)
        appliedIcons.current.set(point.cuenta, icon)
      }
      existing.setPopupContent(popupHtml(point))
    }

    for (const [cuenta, marker] of markers.current) {
      if (seen.has(cuenta)) continue
      group.removeLayer(marker)
      markers.current.delete(cuenta)
      appliedIcons.current.delete(cuenta)
    }
  }, [points, liveAccount])

  useEffect(() => {
    const current = markers.current
    return () => {
      current.clear()
    }
  }, [])

  return <MarkerClusterGroup ref={groupRef} iconCreateFunction={clusterIcon} />
}

/** Reports the settled view so the caller can load lots for that box. */
function ViewReporter({ onViewChange }: { onViewChange: (view: MapView) => void }) {
  const map = useMap()

  useEffect(() => {
    const report = () =>
      onViewChange({ bbox: bboxOfBounds(map.getBounds()), zoom: Math.round(map.getZoom()) })

    map.on('moveend', report)
    report()

    return () => {
      map.off('moveend', report)
    }
  }, [map, onViewChange])

  return null
}

function FocusController({
  points,
  ugestionLayer,
  sucursalLayer,
  ugestionId,
  sucursalId,
  narrowScope,
  fitKey,
}: {
  points: MapPoint[]
  ugestionLayer?: MapLayer<UgestionLayerProperties>
  sucursalLayer?: MapLayer<SucursalLayerProperties>
  ugestionId?: string
  sucursalId?: string
  /** True when the filters reach a zona, a filial or a route. */
  narrowScope: boolean
  fitKey: string
}) {
  const map = useMap()
  const lastKey = useRef<string | null>(null)

  const target = useMemo(() => {
    // A route/zone/filial filter is about the accounts of that route: frame them,
    // deep enough for the lots layer to start answering (zoom >= 15).
    if (narrowScope && points.length > 0) {
      return { kind: 'points', points, maxZoom: 16 } as const
    }
    if (ugestionId) {
      const feature = ugestionLayer?.collection.features.find(
        (candidate) => String(candidate.properties.id) === ugestionId,
      )
      if (feature) return { kind: 'ugestion', feature } as const
    }
    if (sucursalId) {
      const feature = sucursalLayer?.collection.features.find(
        (candidate) => String(candidate.properties.id) === sucursalId,
      )
      if (feature) return { kind: 'sucursal', feature } as const
    }
    return points.length > 0 ? ({ kind: 'points', points, maxZoom: 13 } as const) : undefined
  }, [points, ugestionLayer, sucursalLayer, ugestionId, sucursalId, narrowScope])

  const wantsBoundary = !narrowScope && Boolean(ugestionId || sucursalId)

  useEffect(() => {
    if (!target) return
    if (!shouldRefit(lastKey.current, fitKey)) return
    // With a boundary filter selected we wait for its polygon: fitting the points
    // first and the polygon later would move the map twice for one filter change.
    if (wantsBoundary && target.kind === 'points') return

    lastKey.current = fitKey

    if (target.kind === 'points') {
      const bounds = L.latLngBounds(
        target.points.map((point) => [point.lat, point.lng] as [number, number]),
      )
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: target.maxZoom })
      return
    }

    const layer = L.geoJSON(target.feature as unknown as GeoJsonObject)
    const bounds = layer.getBounds()
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [24, 24], maxZoom: 13 })
  }, [map, target, fitKey, wantsBoundary])

  return null
}

function MapControls({ home, homeLabel }: { home: MapCenter; homeLabel: string }) {
  const map = useMap()
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggleFullscreen = () => {
    const shell = map.getContainer().closest('.map-shell')
    if (!shell) return
    if (document.fullscreenElement) void document.exitFullscreen?.()
    else void (shell as HTMLElement).requestFullscreen?.()
  }

  return (
    <div className="absolute right-3 top-3 z-[800] flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => map.flyTo([home.lat, home.lng], home.zoom)}
        className="grid size-9 place-items-center rounded-lg border border-border-subtle bg-surface/95 text-fg shadow-panel hover:text-primary"
        aria-label={homeLabel}
        title={homeLabel}
      >
        <Target className="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={toggleFullscreen}
        className="grid size-9 place-items-center rounded-lg border border-border-subtle bg-surface/95 text-fg shadow-panel hover:text-primary"
        aria-label={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
        title={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
      >
        {fullscreen ? <Minimize2 className="size-4" aria-hidden="true" /> : <Maximize2 className="size-4" aria-hidden="true" />}
      </button>
    </div>
  )
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

export interface MapLayersProp {
  ugestiones?: MapLayer<UgestionLayerProperties>
  sucursales?: MapLayer<SucursalLayerProperties>
  predios?: MapLayer<PredioLayerProperties>
}

export interface ChangesMapProps {
  points: MapPoint[]
  highlight?: { lat: number; lng: number; id: string } | null
  height?: number | string
  layers?: MapLayersProp
  /** All optional, so the map can be rendered alone (preview and tests). */
  visible?: Record<LayerKey, boolean>
  baseMap?: BaseMap
  onBaseMapChange?: (baseMap: BaseMap) => void
  onToggleLayer?: (key: LayerKey) => void
  view?: MapView
  ugestionId?: string
  sucursalId?: string
  /** A route-level filter: frame the accounts of that route instead of the polygon. */
  narrowScope?: boolean
  /** Only a change here re-frames the map: live events never do. */
  fitKey?: string
  /** Where the map starts and returns to: the user's scope (Alcance.Mapa). */
  home?: MapCenter
  /** Label of the control that returns to `home`. */
  homeLabel?: string
  onViewChange?: (view: MapView) => void
  onSelectAccount?: (cuenta: string) => void
}

export function ChangesMap({
  points,
  highlight,
  height = 420,
  layers,
  visible = DEFAULT_LAYER_VISIBILITY,
  baseMap = 'openStreetMap',
  onBaseMapChange = NOOP,
  onToggleLayer = NOOP,
  view = { bbox: NICARAGUA_BBOX, zoom: 7 },
  ugestionId,
  sucursalId,
  narrowScope = false,
  fitKey = 'initial',
  home = NICARAGUA_HOME,
  homeLabel = 'Centrar en Nicaragua',
  onViewChange = NOOP,
  onSelectAccount = NOOP,
}: ChangesMapProps) {
  const liveAccount = highlight ? String(highlight.id) : undefined

  const ugestionKey = `${layers?.ugestiones?.collection.features.length ?? 0}`
  const sucursalKey = `${layers?.sucursales?.collection.features.length ?? 0}`
  const predioKey = `${layers?.predios?.collection.features.length ?? 0}`
  const tiles = BASE_LAYERS[baseMap]

  return (
    <div
      className="map-shell relative max-h-full"
      style={{ height, minHeight: 0 }}
      data-points={points.length}
      data-testid="changes-map"
      data-zoom={view.zoom}
    >
      <MapContainer
        center={[home.lat, home.lng]}
        zoom={home.zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer key={baseMap} url={tiles.url} attribution={tiles.attribution} />

        {/* Stable keys: an unkeyed conditional sibling shifts positions and makes
            React remount the cluster layer (and reset the map) on data changes. */}
        <ViewReporter key="view" onViewChange={onViewChange} />
        <FocusController
          key="focus"
          points={points}
          ugestionLayer={layers?.ugestiones}
          sucursalLayer={layers?.sucursales}
          ugestionId={ugestionId}
          sucursalId={sucursalId}
          narrowScope={narrowScope}
          fitKey={fitKey}
        />

        <div key="layers" className="absolute right-3 top-[92px] z-[800]">
          <MapLayersPopover
            baseMap={baseMap}
            onBaseMapChange={onBaseMapChange}
            visible={visible}
            onToggleLayer={onToggleLayer}
            zoom={view.zoom}
          />
        </div>
        <MapControls key="controls" home={home} homeLabel={homeLabel} />

        {visible.ugestiones && layers?.ugestiones ? (
          <GeoJSON
            key={`ugestiones-${ugestionKey}`}
            data={layers.ugestiones.collection as unknown as GeoJsonObject}
            style={UGESTION_STYLE}
            onEachFeature={(feature, layer) => {
              const nombre = String(
                (feature.properties as UgestionLayerProperties | null)?.nombre ?? '',
              )
              layer.bindTooltip(escapeHtml(nombre), { sticky: true })
              layer.on({
                mouseover: () => (layer as L.Path).setStyle({ weight: 2.6, fillOpacity: 1 }),
                mouseout: () => (layer as L.Path).setStyle(UGESTION_STYLE),
              })
            }}
          />
        ) : null}

        {visible.sucursales && layers?.sucursales ? (
          <GeoJSON
            key={`sucursales-${sucursalKey}`}
            data={layers.sucursales.collection as unknown as GeoJsonObject}
            style={SUCURSAL_STYLE}
            onEachFeature={(feature, layer) => {
              const nombre = String(
                (feature.properties as SucursalLayerProperties | null)?.nombre ?? '',
              )
              layer.bindTooltip(escapeHtml(nombre), { sticky: true })
              layer.on({
                mouseover: () => (layer as L.Path).setStyle({ weight: 2.6, fillOpacity: 1 }),
                mouseout: () => (layer as L.Path).setStyle(SUCURSAL_STYLE),
              })
            }}
          />
        ) : null}

        {visible.predios && layers?.predios ? (
          <GeoJSON
            key={`predios-${predioKey}-${view.zoom}`}
            data={layers.predios.collection as unknown as GeoJsonObject}
            style={(feature) =>
              predioPathStyle(
                estadoOfProperties(feature?.properties as Partial<PredioLayerProperties> | undefined),
              )
            }
            onEachFeature={(feature, layer) => {
              const properties = feature.properties as PredioLayerProperties | null
              if (!properties) return

              const base = predioPathStyle(properties.estado)
              const html = predioPopupLines(properties)
                .map(([label, value]) => `<div><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</div>`)
                .join('')
              layer.bindPopup(`<div class="predio-popup">${html}</div>`, { maxWidth: 260 })
              layer.on({
                mouseover: () => (layer as L.Path).setStyle({ weight: 2, fillOpacity: 0.8 }),
                mouseout: () => (layer as L.Path).setStyle(base),
              })
            }}
          />
        ) : null}

        {visible.cambios ? (
          <ClusterMarkers
            key="cambios"
            points={points}
            liveAccount={liveAccount}
            onSelect={onSelectAccount}
          />
        ) : null}
      </MapContainer>

      <div className="absolute bottom-[42px] left-3 z-[800]">
        <MapLegend predios={visible.predios} />
      </div>
    </div>
  )
}
