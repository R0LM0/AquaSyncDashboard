import { describe, expect, it } from 'vitest'
import { ForbiddenError } from '../../domain/errors'
import type { Filters } from '../../domain/types'
import { MockDashboardApi } from './MockDashboardApi'

const NICARAGUA = { minLng: -87.7, minLat: 10.7, maxLng: -83.1, maxLat: 15 }

function apiFor(usuario: string) {
  const api = new MockDashboardApi({ today: new Date(2026, 9, 27) })
  return api.login(usuario, 'clave').then(() => api)
}

describe('mock login users', () => {
  it('signs admin in as a country user centred on Nicaragua', async () => {
    const session = await new MockDashboardApi().login('admin', 'clave')

    expect(session.alcance.pais).toBe(true)
    expect(session.alcance.mapa).toEqual({ lat: 12.8654, lng: -85.2072, zoom: 7 })
  })

  it('signs dsoriano in restricted to Madriz, unidad 4, with no sucursal list', async () => {
    const session = await new MockDashboardApi().login('dsoriano', 'clave')

    expect(session.alcance).toEqual({
      pais: false,
      ugestionId: '4',
      ugestionNombre: 'Unidad de Gestión Madriz',
      dptoId: '4',
      sucursales: [],
      mapa: { lat: 13.48, lng: -86.47, zoom: 11 },
    })
  })
})

describe('mock cascade for a restricted user', () => {
  it('offers only the Madriz departamento', async () => {
    const api = await apiFor('dsoriano')

    expect((await api.cascade('departamento', {})).map((option) => option.id)).toEqual(['4'])
  })

  it('walks Madriz down to its filial, zona and ruta', async () => {
    const api = await apiFor('dsoriano')
    const chain = { dptoId: '4', ugestionId: '4', ciudadId: '41' }

    const sucursales = await api.cascade('sucursal', { ciudadId: '41' })
    expect(sucursales.map((option) => option.nombre)).toEqual(['Sucursal Somoto'])

    const sucursalId = sucursales[0].id
    const filiales = await api.cascade('filial', { ...chain, sucursalId })
    expect(filiales.map((option) => option.id)).toEqual(['590'])

    const zonas = await api.cascade('zona', { ...chain, sucursalId, filial: '590' })
    expect(zonas.map((option) => option.nombre)).toEqual(['Zona Somoto Centro'])

    const rutas = await api.cascade('ruta', { ...chain, sucursalId, filial: '590', zona: 'Zona Somoto Centro' })
    expect(rutas.map((option) => option.nombre)).toEqual(['Ruta SOM-01', 'Ruta SOM-02'])
  })

  it('refuses a cascade parent outside its unidad with a forbidden error', async () => {
    const api = await apiFor('dsoriano')

    await expect(api.cascade('ciudad', { ugestionId: '1' })).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('refuses a report filter outside its unidad', async () => {
    const api = await apiFor('dsoriano')

    await expect(api.summary({ desde: '2026-10-01', hasta: '2026-10-27', ugestionId: '1' })).rejects.toBeInstanceOf(
      ForbiddenError,
    )
  })

  it('forces its unidad when the filter is empty, so it never sees the country', async () => {
    const api = await apiFor('dsoriano')
    const filters: Filters = { desde: '2026-10-01', hasta: '2026-10-27' }

    const page = await api.changes(filters, 1, 200)

    expect(page.total).toBeGreaterThan(0)
    expect(page.rows.every((row) => row.ruta.startsWith('Ruta SOM'))).toBe(true)
  })
})

describe('mock cascade for a country user', () => {
  it('offers every departamento and the unidades of one of them', async () => {
    const api = new MockDashboardApi()

    expect((await api.cascade('departamento', {})).length).toBeGreaterThan(1)
    expect((await api.cascade('ugestion', { dptoId: '1' })).map((option) => option.id)).toEqual(['1'])
  })
})

describe('mock predio states', () => {
  it('reports all four states over a single day of the period', async () => {
    const api = new MockDashboardApi({ today: new Date(2026, 9, 27) })

    const layer = await api.layerPredios({
      bbox: NICARAGUA,
      zoom: 16,
      desde: '2026-10-27',
      hasta: '2026-10-27',
    })

    const estados = new Set(layer.collection.features.map((feature) => feature.properties.estado))
    expect([...estados].sort()).toEqual(['sin_asociacion', 'sin_ubicacion', 'trabajado', 'vinculado'])
  })
})
