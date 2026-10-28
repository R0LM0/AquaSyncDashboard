import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MAP_PREFERENCES,
  MAP_PREFERENCES_KEY,
  readMapPreferences,
  saveMapPreferences,
} from './mapPreferences'

describe('map preferences', () => {
  it('falls back to the defaults when nothing is stored', () => {
    const storage = new Map<string, string>()
    const fake = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => void storage.set(key, value),
      removeItem: (key: string) => void storage.delete(key),
    } as unknown as Storage

    expect(readMapPreferences(fake)).toEqual(DEFAULT_MAP_PREFERENCES)
  })

  it('round trips the base map and the visible layers', () => {
    const storage = new Map<string, string>()
    const fake = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => void storage.set(key, value),
      removeItem: (key: string) => void storage.delete(key),
    } as unknown as Storage

    saveMapPreferences(
      {
        baseMap: 'satellite',
        visible: { ugestiones: true, sucursales: true, predios: false, cambios: true },
      },
      fake,
    )

    expect(storage.has(MAP_PREFERENCES_KEY)).toBe(true)
    expect(readMapPreferences(fake)).toEqual({
      baseMap: 'satellite',
      visible: { ugestiones: true, sucursales: true, predios: false, cambios: true },
    })
  })

  it('ignores a corrupted value', () => {
    const fake = {
      getItem: () => '{not json',
      setItem: () => undefined,
      removeItem: () => undefined,
    } as unknown as Storage

    expect(readMapPreferences(fake)).toEqual(DEFAULT_MAP_PREFERENCES)
  })

  it('keeps the defaults for the members a partial value does not define', () => {
    const fake = {
      getItem: () => JSON.stringify({ baseMap: 'nope', visible: { cambios: false } }),
      setItem: () => undefined,
      removeItem: () => undefined,
    } as unknown as Storage

    expect(readMapPreferences(fake)).toEqual({
      baseMap: DEFAULT_MAP_PREFERENCES.baseMap,
      visible: { ...DEFAULT_MAP_PREFERENCES.visible, cambios: false },
    })
  })
})
