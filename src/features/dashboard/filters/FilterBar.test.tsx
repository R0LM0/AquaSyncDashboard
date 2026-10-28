import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ALCANCE_PAIS } from '@/domain/alcance'
import type { Alcance, Filters } from '@/domain/types'
import { FilterBar, type FilterBarOptions } from './FilterBar'

const RESTRICTED: Alcance = {
  pais: false,
  ugestionId: '4',
  ugestionNombre: 'Unidad de Gestión Madriz',
  dptoId: '4',
  sucursales: [],
  mapa: { lat: 13.48, lng: -86.47, zoom: 11 },
}

const options: FilterBarOptions = {
  departamento: [{ id: '4', nombre: 'Madriz' }],
  ugestion: [{ id: '4', nombre: 'Unidad de Gestión Madriz' }],
  ciudad: [{ id: '41', nombre: 'Somoto' }],
  sucursal: [{ id: '401', nombre: 'Sucursal Somoto' }],
  filial: [{ id: '590', nombre: '590' }],
  zona: [{ id: 'Zona Somoto Centro', nombre: 'Zona Somoto Centro' }],
  ruta: [{ id: 'Ruta SOM-01', nombre: 'Ruta SOM-01' }],
  usuarios: [{ id: 'jmedina', nombre: 'José Medina' }],
}

function renderBar(filters: Filters, alcance = ALCANCE_PAIS) {
  const onChange = vi.fn()
  const onReset = vi.fn()
  render(
    <FilterBar
      filters={filters}
      options={options}
      alcance={alcance}
      onChange={onChange}
      onReset={onReset}
      defaultOpen
    />,
  )
  return { onChange, onReset }
}

describe('FilterBar cascade', () => {
  it('keeps the departamento and unidad of a restricted user fixed and disabled', () => {
    renderBar({ desde: '2026-10-01', hasta: '2026-10-27', departamentoId: '4', ugestionId: '4' }, RESTRICTED)

    expect(screen.getByRole('combobox', { name: 'Departamento' })).toBeDisabled()
    expect(screen.getByRole('combobox', { name: 'Unidad de gestión' })).toBeDisabled()
    expect(screen.getAllByTitle('Asignado a tu usuario')).toHaveLength(2)
  })

  it('lets a country user change every level once the chain above is chosen', () => {
    renderBar({
      desde: '2026-10-01',
      hasta: '2026-10-27',
      departamentoId: '4',
      ugestionId: '4',
      ciudadId: '41',
      sucursalId: '401',
      filial: '590',
      zona: 'Zona Somoto Centro',
    })

    for (const name of ['Departamento', 'Unidad de gestión', 'Ciudad', 'Sucursal', 'Filial', 'Zona', 'Ruta', 'Usuario']) {
      expect(screen.getByRole('combobox', { name })).toBeEnabled()
    }
    expect(screen.queryByTitle('Asignado a tu usuario')).not.toBeInTheDocument()
  })

  it('disables a level whose parent is not chosen yet', () => {
    renderBar({ desde: '2026-10-01', hasta: '2026-10-27' })

    expect(screen.getByRole('combobox', { name: 'Ciudad' })).toBeDisabled()
    expect(screen.getByRole('combobox', { name: 'Ruta' })).toBeDisabled()
  })

  it('reports a change of a cascade level as a patch of that level', () => {
    const { onChange } = renderBar({
      desde: '2026-10-01',
      hasta: '2026-10-27',
      departamentoId: '4',
      ugestionId: '4',
    })

    fireEvent.click(screen.getByRole('combobox', { name: 'Ciudad' }))
    fireEvent.click(screen.getByRole('option', { name: 'Somoto' }))

    expect(onChange).toHaveBeenCalledWith({ ciudadId: '41' })
  })

  it('offers Limpiar for a restricted user only when a level the user can change is set', () => {
    renderBar({ desde: '2026-10-01', hasta: '2026-10-27', departamentoId: '4', ugestionId: '4' }, RESTRICTED)
    expect(screen.queryByRole('button', { name: /Limpiar/ })).not.toBeInTheDocument()
  })
})
