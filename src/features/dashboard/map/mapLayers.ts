/** Country centre (Alcance.Mapa of a country user). */
import { NICARAGUA_HOME } from '@/domain/alcance'

export const NICARAGUA_CENTER: [number, number] = [NICARAGUA_HOME.lat, NICARAGUA_HOME.lng]

/** Country bounding box, the default view before the map reports its own. */
export const NICARAGUA_BBOX = {
  minLng: -87.7,
  minLat: 10.7,
  maxLng: -83.1,
  maxLat: 15,
}

export const BASE_LAYERS = {
  openStreetMap: {
    name: 'OpenStreetMap',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
  },
  satellite: {
    name: 'Satélite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri',
  },
} as const
