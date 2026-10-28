import type { CoverageAccount, CoverageEstado } from '@/domain/types'

/** Which estados the coverage map shows. Pendientes are the clients to visit, so they start on. */
export type LayerVisibility = Record<CoverageEstado, boolean>

export const DEFAULT_LAYER_VISIBILITY: LayerVisibility = {
  pendiente: true,
  trabajada: false,
  fuera_de_ruta: false,
}

/** Draw order: pendientes last, so they stay on top of the other markers. */
const DRAW_ORDER: CoverageEstado[] = ['trabajada', 'fuera_de_ruta', 'pendiente']

export function toggleLayer(visibility: LayerVisibility, estado: CoverageEstado): LayerVisibility {
  return { ...visibility, [estado]: !visibility[estado] }
}

/** The accounts of the layers that are on, in draw order. */
export function layerAccounts(accounts: CoverageAccount[], visibility: LayerVisibility): CoverageAccount[] {
  return DRAW_ORDER.filter((estado) => visibility[estado]).flatMap((estado) =>
    accounts.filter((account) => account.estado === estado),
  )
}

/**
 * Google Maps search for a point, opened in a new tab by the caller.
 * Null when a coordinate is missing or not a finite number.
 */
export function googleMapsSearchUrl(lat: number, lng: number): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
}

/** Escapes text placed in popup HTML, so an account's data can never inject markup. */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
