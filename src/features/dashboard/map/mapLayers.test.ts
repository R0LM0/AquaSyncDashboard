import { describe, expect, it } from 'vitest'
import { BASE_LAYERS } from './mapLayers'

describe('BASE_LAYERS', () => {
  it('uses the Google hybrid imagery that SIGIL users already know for the satellite map', () => {
    expect(BASE_LAYERS.satellite.url).toBe('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}')
    expect(BASE_LAYERS.satellite.name).toBe('Satélite (Google)')
    expect(BASE_LAYERS.satellite.attribution).toContain('Google')
  })

  it('keeps OpenStreetMap as the street map', () => {
    expect(BASE_LAYERS.openStreetMap.url).toBe('https://tile.openstreetmap.org/{z}/{x}/{y}.png')
  })
})
