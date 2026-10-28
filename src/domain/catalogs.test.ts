import { describe, expect, it } from 'vitest'
import { narrowCatalogs } from './catalogs'
import type { Catalogs } from './types'

const catalogs: Catalogs = {
  ugestiones: [
    { id: 'UG-1', nombre: 'Gestión Uno' },
    { id: 'UG-2', nombre: 'Gestión Dos' },
  ],
  sucursales: [
    { id: 'SU-1', nombre: 'Sucursal Uno', ugestionId: 'UG-1' },
    { id: 'SU-2', nombre: 'Sucursal Dos', ugestionId: 'UG-2' },
  ],
  filiales: [
    { id: 'FL-1', nombre: 'Filial Uno' },
    { id: 'FL-2', nombre: 'Filial Dos' },
  ],
  zonas: [
    { id: 'Z-1', nombre: 'Zona Uno', filial: 'Filial Uno' },
    { id: 'Z-2', nombre: 'Zona Dos', filial: 'Filial Dos' },
  ],
  rutas: [
    { id: 'R-1', nombre: 'Ruta Uno', filial: 'Filial Uno', zona: 'Zona Uno' },
    { id: 'R-2', nombre: 'Ruta Dos', filial: 'Filial Uno', zona: 'Zona Dos' },
    { id: 'R-3', nombre: 'Ruta Tres', filial: 'Filial Dos', zona: 'Zona Dos' },
  ],
  usuarios: [
    { id: 'usuario-uno', nombre: 'Usuario Uno' },
    { id: 'usuario-dos', nombre: 'Usuario Dos' },
  ],
}

describe('narrowCatalogs', () => {
  it('limits sucursales to the selected gestión', () => {
    const narrowed = narrowCatalogs(catalogs, { desde: '2026-10-01', hasta: '2026-10-02', ugestionId: 'UG-2' })

    expect(narrowed.sucursales.map((option) => option.id)).toEqual(['SU-2'])
  })

  it('limits zonas to the selected filial', () => {
    const narrowed = narrowCatalogs(catalogs, { desde: '2026-10-01', hasta: '2026-10-02', filial: 'Filial Uno' })

    expect(narrowed.zonas.map((option) => option.id)).toEqual(['Z-1'])
  })

  it('limits rutas to the selected filial and zona', () => {
    const narrowed = narrowCatalogs(catalogs, {
      desde: '2026-10-01',
      hasta: '2026-10-02',
      filial: 'Filial Uno',
      zona: 'Zona Dos',
    })

    expect(narrowed.rutas.map((option) => option.id)).toEqual(['R-2'])
  })

  it('keeps every option when nothing is selected', () => {
    const filters = { desde: '2026-10-01', hasta: '2026-10-02' }

    expect(narrowCatalogs(catalogs, filters)).toEqual(catalogs)
  })
})
