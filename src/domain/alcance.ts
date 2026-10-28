import type { Alcance } from './types'

/** Default map view of the country: Nicaragua. */
export const NICARAGUA_HOME = { lat: 12.8654, lng: -85.2072, zoom: 7 } as const

/** A country user (SIGIL ugestion 0) sees everything and starts on Nicaragua. */
export const ALCANCE_PAIS: Alcance = {
  pais: true,
  sucursales: [],
  mapa: { ...NICARAGUA_HOME },
}
