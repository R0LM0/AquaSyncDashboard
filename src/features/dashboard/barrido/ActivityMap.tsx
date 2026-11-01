import L from 'leaflet'
import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { cn } from '@/lib/utils'
import { BASE_LAYERS, NICARAGUA_CENTER } from '../map/mapLayers'
import { EmptyState } from '../EmptyState'

export interface ActivityMapPoint {
  id: string
  lat: number
  lng: number
  color: string
  /** Surveys and registrations are solid dots; the pending accounts are hollow rings. */
  kind: 'registro' | 'pendiente'
  popup: string
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
  onToggle: () => void
}

const LOCATE_ZOOM = 16
/** Past this many points Leaflet draws on a canvas: thousands of SVG circles make the map sluggish. */
const CANVAS_FROM = 1500

function ActivityMarkers({ points, focus }: { points: ActivityMapPoint[]; focus: ActivityFocus | null }) {
  const map = useMap()
  const markers = useRef(new Map<string, L.CircleMarker>())

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
        button?.addEventListener('click', () => map.flyTo([point.lat, point.lng], Math.max(map.getZoom(), LOCATE_ZOOM)), {
          once: true,
        })
      })
      marker.addTo(group)
      registry.set(point.id, marker)
    }

    markers.current = registry
    return () => {
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

export interface ActivityMapProps {
  points: ActivityMapPoint[]
  fitKey: string
  legend: Array<{ label: string; color: string }>
  focus: ActivityFocus | null
  pending?: PendingToggle
  emptyTitle: string
  emptyDetail: string
  ariaLabel: string
}

export function ActivityMap({ points, fitKey, legend, focus, pending, emptyTitle, emptyDetail, ariaLabel }: ActivityMapProps) {
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
          <span
            className="size-2.5 rounded-full border-2 border-dashed border-muted-fg"
            aria-hidden="true"
          />
          {pending.busy
            ? 'Cargando pendientes…'
            : pending.on && pending.count !== null
              ? `Cuentas pendientes (${pending.count})`
              : 'Mostrar cuentas pendientes'}
        </button>
      ) : null}

      {points.length === 0 ? (
        <EmptyState title={emptyTitle} detail={emptyDetail} />
      ) : (
        <div
          className="h-[360px] overflow-hidden rounded-xl border border-border-subtle"
          role="group"
          aria-label={ariaLabel}
        >
          <MapContainer center={NICARAGUA_CENTER} zoom={12} scrollWheelZoom={false} preferCanvas={points.length > CANVAS_FROM} className="h-full w-full">
            <TileLayer url={BASE_LAYERS.openStreetMap.url} attribution={BASE_LAYERS.openStreetMap.attribution} />
            <FitToPoints points={points} fitKey={fitKey} />
            <ActivityMarkers points={points} focus={focus} />
          </MapContainer>
        </div>
      )}

      {legend.length > 0 ? (
        <ul className="flex flex-wrap gap-3 text-xs font-semibold text-muted-fg" aria-label="Dispositivos del mapa">
          {legend.map((item) => (
            <li key={item.label} className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ background: item.color }} aria-hidden="true" />
              {item.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
