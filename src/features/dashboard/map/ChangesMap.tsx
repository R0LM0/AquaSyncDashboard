import L from 'leaflet'
import { useEffect } from 'react'
import {
  Circle,
  LayersControl,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { CHANGE_TYPE_COLORS, CHANGE_TYPE_LABELS } from '../../../domain/labels'
import type { MapPoint } from '../../../domain/types'
import { formatDateTime } from '../../../shared/format'
import { BASE_LAYERS, NICARAGUA_CENTER } from './mapLayers'

const icons = new Map<string, L.DivIcon>()

function markerIcon(color: string): L.DivIcon {
  const cached = icons.get(color)
  if (cached) return cached

  const icon = L.divIcon({
    className: 'map-pin',
    html: `<span style="background:${color}"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
  icons.set(color, icon)
  return icon
}

function FitToPoints({ points }: { points: MapPoint[] }) {
  const map = useMap()
  const key = points.map((point) => point.cuenta).join('|')

  useEffect(() => {
    if (points.length === 0) return
    const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lng] as [number, number]))
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 13 })
  }, [map, key, points])

  return null
}

export interface ChangesMapProps {
  points: MapPoint[]
  highlight?: { lat: number; lng: number; id: string } | null
}

export function ChangesMap({ points, highlight }: ChangesMapProps) {
  return (
    <MapContainer center={NICARAGUA_CENTER} zoom={7} className="map" scrollWheelZoom>
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name={BASE_LAYERS.openStreetMap.name}>
          <TileLayer
            url={BASE_LAYERS.openStreetMap.url}
            attribution={BASE_LAYERS.openStreetMap.attribution}
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name={BASE_LAYERS.satellite.name}>
          <TileLayer
            url={BASE_LAYERS.satellite.url}
            attribution={BASE_LAYERS.satellite.attribution}
          />
        </LayersControl.BaseLayer>
      </LayersControl>

      <FitToPoints points={points} />

      {points.map((point) => (
        <Marker
          key={point.cuenta}
          position={[point.lat, point.lng]}
          icon={markerIcon(CHANGE_TYPE_COLORS[point.tipoCambio])}
        >
          <Popup>
            <strong>Cuenta {point.cuenta}</strong>
            <br />
            {point.cliente}
            <br />
            {CHANGE_TYPE_LABELS[point.tipoCambio]}
            <br />
            {point.usuario} · {formatDateTime(point.fecha)}
          </Popup>
        </Marker>
      ))}

      {highlight ? (
        <Circle
          center={[highlight.lat, highlight.lng]}
          radius={700}
          pathOptions={{ className: 'map-highlight', color: '#c8102e', weight: 2, fillOpacity: 0.15 }}
        />
      ) : null}
    </MapContainer>
  )
}

