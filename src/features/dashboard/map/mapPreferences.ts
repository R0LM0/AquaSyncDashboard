import type { LayerKey } from './mapView'

export type BaseMap = 'openStreetMap' | 'satellite'

export interface MapPreferences {
  baseMap: BaseMap
  visible: Record<LayerKey, boolean>
}

export const MAP_PREFERENCES_KEY = 'aquasync.mapa.preferencias'

export const DEFAULT_MAP_PREFERENCES: MapPreferences = {
  baseMap: 'openStreetMap',
  visible: { ugestiones: false, sucursales: false, predios: true, cambios: true },
}

const BASE_MAPS: readonly BaseMap[] = ['openStreetMap', 'satellite']
const LAYER_KEYS: readonly LayerKey[] = ['ugestiones', 'sucursales', 'predios', 'cambios']

/** Tolerant read: a corrupted or partial value falls back to the defaults. */
export function readMapPreferences(storage: Storage = localStorage): MapPreferences {
  try {
    const raw = storage.getItem(MAP_PREFERENCES_KEY)
    if (!raw) return DEFAULT_MAP_PREFERENCES

    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return DEFAULT_MAP_PREFERENCES

    const candidate = parsed as Partial<MapPreferences>
    const baseMap = BASE_MAPS.includes(candidate.baseMap as BaseMap)
      ? (candidate.baseMap as BaseMap)
      : DEFAULT_MAP_PREFERENCES.baseMap

    const visible = { ...DEFAULT_MAP_PREFERENCES.visible }
    if (candidate.visible && typeof candidate.visible === 'object') {
      for (const key of LAYER_KEYS) {
        if (typeof candidate.visible[key] === 'boolean') visible[key] = candidate.visible[key] as boolean
      }
    }

    return { baseMap, visible }
  } catch {
    return DEFAULT_MAP_PREFERENCES
  }
}

export function saveMapPreferences(
  preferences: MapPreferences,
  storage: Storage = localStorage,
): void {
  try {
    storage.setItem(MAP_PREFERENCES_KEY, JSON.stringify(preferences))
  } catch {
    /* private mode: the choice just does not persist */
  }
}
