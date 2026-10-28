import type { BBox, LayerCollection, LayerFeature, MapLayer } from '@/domain/types'

export type Ring = Array<[number, number]>

export function bboxOfPoints(points: Array<{ lat: number; lng: number }>, pad = 0.03): BBox {
  const lats = points.map((point) => point.lat)
  const lngs = points.map((point) => point.lng)

  return {
    minLat: Math.min(...lats) - pad,
    maxLat: Math.max(...lats) + pad,
    minLng: Math.min(...lngs) - pad,
    maxLng: Math.max(...lngs) + pad,
  }
}

/** A slightly irregular ring around the box, so it does not look like a table. */
export function ringFromBbox(bbox: BBox, random: () => number, jitter = 0.008): Ring {
  const wobble = () => (random() - 0.5) * jitter * 2

  return [
    [bbox.minLng + wobble(), bbox.maxLat + wobble()],
    [bbox.maxLng + wobble(), bbox.maxLat + wobble()],
    [bbox.maxLng + wobble(), bbox.minLat + wobble()],
    [bbox.minLng + wobble(), bbox.minLat + wobble()],
    [bbox.minLng + wobble(), bbox.maxLat + wobble()],
  ]
}

/** Small square around the account, like a cadastral lot. */
export function predioRing(lat: number, lng: number, random: () => number, side = 0.00035): Ring {
  const half = side / 2
  const jitter = () => (random() - 0.5) * 0.00006

  return [
    [lng - half + jitter(), lat + half + jitter()],
    [lng + half + jitter(), lat + half + jitter()],
    [lng + half + jitter(), lat - half + jitter()],
    [lng - half + jitter(), lat - half + jitter()],
    [lng - half + jitter(), lat + half + jitter()],
  ]
}

export function featureFromRing<Properties>(
  ring: Ring,
  properties: Properties,
): LayerFeature<Properties> {
  return {
    type: 'Feature',
    geometry: { type: 'MultiPolygon', coordinates: [[ring]] },
    properties,
  }
}

export function collectionOf<Properties>(
  features: Array<LayerFeature<Properties>>,
): LayerCollection<Properties> {
  return { type: 'FeatureCollection', features }
}

export function bboxOfRing(ring: Ring): BBox {
  const lngs = ring.map(([lng]) => lng)
  const lats = ring.map(([, lat]) => lat)

  return {
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
  }
}

export function intersects(a: BBox, b: BBox): boolean {
  return !(a.maxLng < b.minLng || a.minLng > b.maxLng || a.maxLat < b.minLat || a.minLat > b.maxLat)
}

/** Zoom at which the API starts returning lots. */
export const PREDIOS_MIN_ZOOM = 15

export function emptyLayer<Properties>(message?: string): MapLayer<Properties> {
  return { collection: collectionOf<Properties>([]), truncated: false, message }
}

/** Inline SVG placeholder so the mock needs no external images. */
export function placeholderPhoto(seed: string, label: string, tone: number): string {
  const palettes = [
    ['#0e7490', '#67e8f9'],
    ['#0f766e', '#5eead4'],
    ['#b45309', '#fcd34d'],
  ]
  const [dark, light] = palettes[tone % palettes.length]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${dark}"/><stop offset="1" stop-color="${light}"/></linearGradient></defs><rect width="320" height="220" fill="url(#g)"/><g fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2"><path d="M40 150h240M40 170h240"/><path d="M60 150v-52l100-44 100 44v52"/><rect x="140" y="112" width="40" height="38"/></g><text x="16" y="30" fill="rgba(255,255,255,.92)" font-family="sans-serif" font-size="14" font-weight="700">${label}</text><text x="16" y="206" fill="rgba(255,255,255,.75)" font-family="monospace" font-size="11">${seed}</text></svg>`

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
