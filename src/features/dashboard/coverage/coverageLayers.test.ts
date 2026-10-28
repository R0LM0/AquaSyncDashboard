import { describe, expect, it } from 'vitest'
import type { CoverageAccount } from '@/domain/types'
import {
  DEFAULT_LAYER_VISIBILITY,
  escapeHtml,
  googleMapsSearchUrl,
  layerAccounts,
  toggleLayer,
} from './coverageLayers'

function account(cuenta: string, estado: CoverageAccount['estado']): CoverageAccount {
  return {
    cuenta,
    cliente: '',
    direccion: '',
    numeroCatastral: '',
    estado,
    usuario: null,
    primeraActividad: null,
    ultimaActividad: null,
    fotos: 0,
    ubicaciones: 0,
    lat: 12.1,
    lng: -86.2,
  }
}

describe('googleMapsSearchUrl', () => {
  it('builds the Google Maps search URL for the coordinates', () => {
    expect(googleMapsSearchUrl(12.1364, -86.2514)).toBe(
      'https://www.google.com/maps/search/?api=1&query=12.1364,-86.2514',
    )
  })

  it('returns null when a coordinate is missing or not finite', () => {
    expect(googleMapsSearchUrl(Number.NaN, -86.2)).toBeNull()
    expect(googleMapsSearchUrl(12.1, Number.POSITIVE_INFINITY)).toBeNull()
  })
})

describe('escapeHtml', () => {
  it('escapes markup so account text can never inject HTML into a popup', () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">&')).toBe(
      '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;',
    )
  })
})

describe('coverage layers', () => {
  it('shows only the pending clients by default', () => {
    expect(DEFAULT_LAYER_VISIBILITY).toEqual({ pendiente: true, trabajada: false, fuera_de_ruta: false })
  })

  it('flips one layer and leaves the others as they are', () => {
    const toggled = toggleLayer(DEFAULT_LAYER_VISIBILITY, 'trabajada')

    expect(toggled).toEqual({ pendiente: true, trabajada: true, fuera_de_ruta: false })
    expect(DEFAULT_LAYER_VISIBILITY.trabajada).toBe(false)
  })

  it('returns the visible accounts with pendientes last, so they are drawn on top', () => {
    const accounts = [account('1', 'pendiente'), account('2', 'trabajada'), account('3', 'fuera_de_ruta'), account('4', 'pendiente')]
    const visible = layerAccounts(accounts, { pendiente: true, trabajada: true, fuera_de_ruta: true })

    expect(visible.map((item) => item.cuenta)).toEqual(['2', '3', '1', '4'])
  })

  it('leaves out the accounts of a hidden layer', () => {
    const accounts = [account('1', 'pendiente'), account('2', 'trabajada')]

    expect(layerAccounts(accounts, DEFAULT_LAYER_VISIBILITY).map((item) => item.cuenta)).toEqual(['1'])
  })
})
