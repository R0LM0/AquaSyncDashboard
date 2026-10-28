import type { BBox, PredioLayerProperties } from '@/domain/types'

/** The API starts answering lots from this zoom. */
export const PREDIOS_MIN_ZOOM = 15

export interface MapView {
  bbox: BBox
  zoom: number
}

export interface LatLngBoundsLike {
  getWest: () => number
  getSouth: () => number
  getEast: () => number
  getNorth: () => number
}

export function bboxOfBounds(bounds: LatLngBoundsLike): BBox {
  return {
    minLng: bounds.getWest(),
    minLat: bounds.getSouth(),
    maxLng: bounds.getEast(),
    maxLat: bounds.getNorth(),
  }
}

/**
 * The map re-frames only when the filters change (or on the first load with
 * data): a live event must never move the user's view.
 */
export function shouldRefit(previousKey: string | null, nextKey: string): boolean {
  return previousKey !== nextKey
}

/** Below the threshold the client does not even ask for lots. */
export function shouldLoadPredios(zoom: number): boolean {
  return zoom >= PREDIOS_MIN_ZOOM
}

export function prediosHint(zoom: number, truncated: boolean, message?: string): string | null {
  if (!shouldLoadPredios(zoom)) return message || 'Acerque el mapa para ver predios'
  if (truncated) return message || 'Mostrando 3000 predios: acerque más'
  return null
}

/** Copy for the predio popup, built from typed properties (no raw HTML). */
const surface = (value: number | null): string =>
  value === null ? '—' : `${value.toLocaleString('es-NI', { maximumFractionDigits: 2 })} m²`

export function predioPopupLines(properties: PredioLayerProperties): Array<[string, string]> {
  return [
    ['Lote', properties.nroLote || '—'],
    ['Manzana', properties.idManzana || '—'],
    ['Superficie terreno', surface(properties.supTerreno)],
    ['Superficie construida', surface(properties.supConst)],
  ]
}

/** `UrlImagen` is relative to the API base; the mock already returns a data URL. */
export function photoSrc(urlImagen: string, apiBase: string): string {
  if (!urlImagen) return ''
  if (/^(data:|blob:|https?:)/i.test(urlImagen)) return urlImagen
  return `${apiBase}${urlImagen.replace(/^\//, '')}`
}

export function googleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`
}

export function coordinatesText(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
}

export type LayerKey = 'ugestiones' | 'sucursales' | 'predios' | 'cambios'

/** Cambios visible by default; the administrative layers start hidden. */
export const DEFAULT_LAYER_VISIBILITY: Record<LayerKey, boolean> = {
  ugestiones: false,
  sucursales: false,
  predios: false,
  cambios: true,
}

export const NOOP = () => undefined

export const LAYER_LABELS: Record<LayerKey, string> = {
  ugestiones: 'Unidades de gestión',
  sucursales: 'Sucursales',
  predios: 'Predios',
  cambios: 'Cambios',
}

/** Pointer-driven highlight for a polygon, shared by both administrative layers. */
export function highlightStyle(active: boolean) {
  return active ? { weight: 2.4, fillOpacity: 0.22 } : undefined
}
