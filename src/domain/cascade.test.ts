import { describe, expect, it } from 'vitest'
import {
  applyFilterPatch,
  cascadeParents,
  lockedLevels,
  scopedFilters,
  sucursalOptionsForScope,
} from './cascade'
import { ALCANCE_PAIS } from './alcance'
import type { Alcance, CatalogOption, Filters } from './types'

const base: Filters = { desde: '2026-10-01', hasta: '2026-10-27' }

/** Restricted user from the contract: Madriz (dpto 4), unidad 4, whole unit. */
const RESTRICTED: Alcance = {
  pais: false,
  ugestionId: '4',
  ugestionNombre: 'Unidad de Gestión Madriz',
  dptoId: '4',
  sucursales: [],
  mapa: { lat: 13.48, lng: -86.47, zoom: 11 },
}

describe('cascadeParents', () => {
  it('loads departamentos without any parent', () => {
    expect(cascadeParents('departamento', base)).toEqual({})
  })

  it('waits for the departamento before loading unidades de gestión', () => {
    expect(cascadeParents('ugestion', base)).toBeNull()
    expect(cascadeParents('ugestion', { ...base, departamentoId: '4' })).toEqual({ dptoId: '4' })
  })

  it('loads ciudades from the unidad and sucursales from the ciudad', () => {
    expect(cascadeParents('ciudad', { ...base, ugestionId: '4' })).toEqual({ ugestionId: '4' })
    expect(cascadeParents('sucursal', { ...base, ciudadId: '41' })).toEqual({ ciudadId: '41' })
    expect(cascadeParents('sucursal', base)).toBeNull()
  })

  it('loads filiales only once the whole chain up to the sucursal is chosen', () => {
    const chain = { ...base, departamentoId: '4', ugestionId: '4', ciudadId: '41' }

    expect(cascadeParents('filial', chain)).toBeNull()
    expect(cascadeParents('filial', { ...chain, sucursalId: '401' })).toEqual({
      dptoId: '4',
      ugestionId: '4',
      ciudadId: '41',
      sucursalId: '401',
    })
  })

  it('loads zonas from the filial and rutas from the zona', () => {
    const chain = { ...base, departamentoId: '4', ugestionId: '4', ciudadId: '41', sucursalId: '401' }

    expect(cascadeParents('zona', chain)).toBeNull()
    expect(cascadeParents('zona', { ...chain, filial: '590' })?.filial).toBe('590')
    expect(cascadeParents('ruta', { ...chain, filial: '590' })).toBeNull()
    expect(cascadeParents('ruta', { ...chain, filial: '590', zona: 'Zona Somoto Centro' })).toEqual({
      dptoId: '4',
      ugestionId: '4',
      ciudadId: '41',
      sucursalId: '401',
      filial: '590',
      zona: 'Zona Somoto Centro',
    })
  })
})

describe('applyFilterPatch', () => {
  const full: Filters = {
    ...base,
    departamentoId: '4',
    ugestionId: '4',
    ciudadId: '41',
    sucursalId: '401',
    filial: '590',
    zona: 'Zona Somoto Centro',
    ruta: 'Ruta SOM-01',
    usuario: 'jmedina',
  }

  it('clears every level below the one that changed', () => {
    expect(applyFilterPatch(full, { ciudadId: '42' }, ALCANCE_PAIS)).toEqual({
      ...base,
      departamentoId: '4',
      ugestionId: '4',
      ciudadId: '42',
      usuario: 'jmedina',
    })
  })

  it('clears the unidad and everything below when the departamento changes', () => {
    expect(applyFilterPatch(full, { departamentoId: '1' }, ALCANCE_PAIS)).toEqual({
      ...base,
      departamentoId: '1',
      usuario: 'jmedina',
    })
  })

  it('passes non cascade filters through untouched', () => {
    const next = applyFilterPatch(full, { tipoCambio: 'FotoNueva', desde: '2026-10-02' }, ALCANCE_PAIS)

    expect(next).toMatchObject({ ...full, tipoCambio: 'FotoNueva', desde: '2026-10-02' })
  })

  it('keeps the scope-fixed levels when a lower level changes for a restricted user', () => {
    const scoped = scopedFilters(base, RESTRICTED)
    const next = applyFilterPatch({ ...scoped, ciudadId: '41' }, { sucursalId: '401' }, RESTRICTED)

    expect(next.departamentoId).toBe('4')
    expect(next.ugestionId).toBe('4')
    expect(next.sucursalId).toBe('401')
  })
})

describe('scopedFilters', () => {
  it('leaves the filters of a country user untouched', () => {
    expect(scopedFilters(base, ALCANCE_PAIS)).toEqual(base)
  })

  it('preselects the departamento and unidad of a restricted user', () => {
    expect(scopedFilters(base, RESTRICTED)).toEqual({ ...base, departamentoId: '4', ugestionId: '4' })
  })

  it('replaces a foreign unidad with the scope', () => {
    expect(scopedFilters({ ...base, ugestionId: '1' }, RESTRICTED).ugestionId).toBe('4')
  })

  it('drops a sucursal outside the sucursal list of the user', () => {
    const withList: Alcance = { ...RESTRICTED, sucursales: ['401'] }

    expect(scopedFilters({ ...base, sucursalId: '999' }, withList).sucursalId).toBeUndefined()
    expect(scopedFilters({ ...base, sucursalId: '401' }, withList).sucursalId).toBe('401')
  })
})

describe('lockedLevels', () => {
  it('locks nothing for a country user', () => {
    expect(lockedLevels(ALCANCE_PAIS)).toEqual([])
  })

  it('locks the departamento and the unidad for a restricted user', () => {
    expect(lockedLevels(RESTRICTED)).toEqual(['departamento', 'ugestion'])
  })
})

describe('sucursalOptionsForScope', () => {
  const options: CatalogOption[] = [
    { id: '401', nombre: 'Sucursal Somoto' },
    { id: '402', nombre: 'Sucursal Totogalpa' },
  ]

  it('offers only the listed sucursales to a restricted user', () => {
    expect(sucursalOptionsForScope(options, { ...RESTRICTED, sucursales: ['402'] })).toEqual([options[1]])
  })

  it('offers every sucursal when the user has no list or is a country user', () => {
    expect(sucursalOptionsForScope(options, RESTRICTED)).toEqual(options)
    expect(sucursalOptionsForScope(options, ALCANCE_PAIS)).toEqual(options)
  })
})
