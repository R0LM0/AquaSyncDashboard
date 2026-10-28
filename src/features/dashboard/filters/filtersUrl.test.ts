import { describe, expect, it } from 'vitest'
import { filtersToParams, paramsToFilters } from './filtersUrl'
import type { Filters } from '../../../domain/types'

const fallback = { desde: '2026-09-28', hasta: '2026-10-27' }

describe('filters <-> URL query string', () => {
  it('round trips every filter', () => {
    const filters: Filters = {
      ugestionId: 'UG-01',
      sucursalId: 'SU-101',
      filial: 'Filial Managua',
      zona: 'Zona Managua Centro',
      ruta: 'Ruta MGA-01',
      usuario: 'jmedina',
      desde: '2026-10-01',
      hasta: '2026-10-15',
      tipoCambio: 'UbicacionCorregida',
    }

    expect(paramsToFilters(filtersToParams(filters), fallback)).toEqual(filters)
  })

  it('round trips an empty filter set', () => {
    const filters: Filters = { desde: '2026-10-01', hasta: '2026-10-15' }

    expect(paramsToFilters(filtersToParams(filters), fallback)).toEqual(filters)
  })

  it('ignores unknown parameters and invalid change types', () => {
    const params = new URLSearchParams('desde=2026-10-01&hasta=2026-10-15&otro=1&tipo=Cualquiera')

    expect(paramsToFilters(params, fallback)).toEqual({ desde: '2026-10-01', hasta: '2026-10-15' })
  })

  it('falls back to the default range when the URL has no dates', () => {
    expect(paramsToFilters(new URLSearchParams('ruta=Ruta%20MGA-02'), fallback)).toEqual({
      desde: fallback.desde,
      hasta: fallback.hasta,
      ruta: 'Ruta MGA-02',
    })
  })

  it('drops blank values instead of filtering by an empty string', () => {
    const params = new URLSearchParams('desde=2026-10-01&hasta=2026-10-15&ruta=&usuario=')

    expect(paramsToFilters(params, fallback)).toEqual({ desde: '2026-10-01', hasta: '2026-10-15' })
  })

  it('serializes only the filters that have a value', () => {
    const params = filtersToParams({ desde: '2026-10-01', hasta: '2026-10-15', usuario: 'jmedina' })

    expect([...params.keys()].sort()).toEqual(['desde', 'hasta', 'usuario'])
  })
})
