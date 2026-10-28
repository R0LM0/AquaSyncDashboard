import L from 'leaflet'
import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { CoverageAccount, CoverageEstado } from '@/domain/types'
import { formatDateTime } from '@/shared/format'
import { cn } from '@/lib/utils'
import { BASE_LAYERS, NICARAGUA_CENTER } from '../map/mapLayers'
import { EmptyState } from '../EmptyState'
import { ESTADO_COLORS, ESTADO_LABELS } from './coverageAggregates'
import { escapeHtml, googleMapsSearchUrl, layerAccounts, type LayerVisibility } from './coverageLayers'

type LocatedAccount = CoverageAccount & { lat: number; lng: number }

/** A request to show one account: the map flies to it and opens its popup. */
export interface MapFocus {
  cuenta: string
  /** Changes on every request, so the same account can be focused twice. */
  nonce: number
}

const LOCATE_ZOOM = 16

function popupHtml(account: CoverageAccount, mapsUrl: string | null): string {
  const when = account.ultimaActividad ? formatDateTime(account.ultimaActividad) : 'Sin actividad'
  const who = account.usuario ? ` · ${escapeHtml(account.usuario)}` : ''
  const actions = [
    mapsUrl
      ? `<a href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener noreferrer">Abrir en Google Maps</a>`
      : '',
    '<button type="button" data-action="locate">Ubicar en el mapa</button>',
  ]

  return [
    `<strong>Cuenta ${escapeHtml(account.cuenta)}</strong>`,
    escapeHtml(account.cliente || 'Sin nombre de cliente'),
    escapeHtml(account.direccion || 'Sin dirección'),
    `${escapeHtml(ESTADO_LABELS[account.estado])}${who}`,
    escapeHtml(when),
    `<div class="coverage-popup-actions">${actions.join(' ')}</div>`,
  ].join('<br/>')
}

/**
 * One circle per visible account. The layers are rebuilt when their visibility changes;
 * a focus request flies to the account's marker and opens its popup.
 */
function CoverageMarkers({ accounts, focus }: { accounts: LocatedAccount[]; focus: MapFocus | null }) {
  const map = useMap()
  const markers = useRef(new Map<string, L.CircleMarker>())

  useEffect(() => {
    const group = L.layerGroup().addTo(map)
    const registry = new Map<string, L.CircleMarker>()

    for (const account of accounts) {
      const color = ESTADO_COLORS[account.estado]
      const marker = L.circleMarker([account.lat, account.lng], {
        radius: 6,
        color,
        fillColor: color,
        fillOpacity: 0.85,
        weight: 1,
      })
      marker.bindPopup(popupHtml(account, googleMapsSearchUrl(account.lat, account.lng)), { maxWidth: 260 })
      // The popup is rebuilt by Leaflet on each open: the locate button gets its listener then.
      marker.on('popupopen', (event: L.PopupEvent) => {
        const button = event.popup.getElement()?.querySelector<HTMLButtonElement>('[data-action="locate"]')
        button?.addEventListener('click', () => map.flyTo([account.lat, account.lng], Math.max(map.getZoom(), LOCATE_ZOOM)), {
          once: true,
        })
      })
      marker.addTo(group)
      registry.set(account.cuenta, marker)
    }

    markers.current = registry
    return () => {
      group.remove()
      markers.current = new Map()
    }
  }, [map, accounts])

  useEffect(() => {
    if (!focus) return
    const marker = markers.current.get(focus.cuenta)
    if (!marker) return
    map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), LOCATE_ZOOM))
    marker.openPopup()
  }, [map, focus])

  return null
}

/** Fits the view to every located account of the route, once per route. */
function FitToRoute({ accounts, routeKey }: { accounts: LocatedAccount[]; routeKey: string }) {
  const map = useMap()
  const framed = useRef<string | null>(null)

  useEffect(() => {
    // Only the route frames the map: a layer toggle or a new list of the same route must not move it.
    if (accounts.length === 0 || framed.current === routeKey) return
    framed.current = routeKey
    map.fitBounds(
      L.latLngBounds(accounts.map((account): [number, number] => [account.lat, account.lng])),
      { padding: [24, 24], maxZoom: 16 },
    )
  }, [map, accounts, routeKey])

  return null
}

export interface CoverageMapProps {
  accounts: CoverageAccount[]
  routeKey: string
  visibility: LayerVisibility
  onToggleLayer: (estado: CoverageEstado) => void
  focus: MapFocus | null
}

export function CoverageMap({ accounts, routeKey, visibility, onToggleLayer, focus }: CoverageMapProps) {
  const located = useMemo(
    () => accounts.filter((account): account is LocatedAccount => account.lat !== null && account.lng !== null),
    [accounts],
  )
  const visible = useMemo(() => layerAccounts(located, visibility) as LocatedAccount[], [located, visibility])

  if (located.length === 0) {
    return (
      <EmptyState
        title="Ninguna cuenta tiene ubicación"
        detail="Las cuentas de la ruta todavía no tienen coordenadas registradas."
      />
    )
  }

  return (
    <div className="space-y-2">
      <div className="h-[340px] overflow-hidden rounded-xl border border-border-subtle">
        <MapContainer key={routeKey} center={NICARAGUA_CENTER} zoom={12} scrollWheelZoom={false} className="h-full w-full">
          <TileLayer url={BASE_LAYERS.openStreetMap.url} attribution={BASE_LAYERS.openStreetMap.attribution} />
          <FitToRoute accounts={located} routeKey={routeKey} />
          <CoverageMarkers accounts={visible} focus={focus} />
        </MapContainer>
      </div>
      <ul className="flex flex-wrap gap-2 text-xs font-semibold" aria-label="Capas del mapa">
        {(Object.keys(ESTADO_LABELS) as CoverageEstado[]).map((estado) => {
          const on = visibility[estado]
          return (
            <li key={estado}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onToggleLayer(estado)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 transition-colors',
                  on ? 'border-border-subtle text-fg' : 'border-dashed border-border-subtle text-muted-fg opacity-60',
                )}
              >
                <span className="size-2.5 rounded-full" style={{ background: ESTADO_COLORS[estado] }} aria-hidden="true" />
                {ESTADO_LABELS[estado]}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
