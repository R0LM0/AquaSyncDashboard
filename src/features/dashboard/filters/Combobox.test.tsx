import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Combobox, type ComboboxProps } from './Combobox'

const options = [
  { value: '401', label: 'Somoto' },
  { value: '402', label: 'León Norte' },
  { value: '403', label: 'Sucursal Managua' },
]

function renderCombobox(overrides: Partial<ComboboxProps> = {}) {
  const onChange = vi.fn()
  render(
    <Combobox
      label="Ciudad"
      value={undefined}
      options={options}
      allLabel="Todas"
      onChange={onChange}
      {...overrides}
    />,
  )
  return { onChange }
}

function openList() {
  fireEvent.click(screen.getByRole('combobox', { name: 'Ciudad' }))
  return screen.getByRole('listbox', { name: 'Ciudad' })
}

describe('Combobox', () => {
  it('names the trigger after its label and shows the all option when nothing is selected', () => {
    renderCombobox()

    const trigger = screen.getByRole('combobox', { name: 'Ciudad' })
    expect(trigger).toHaveTextContent('Todas')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('lists the all option first, then every option', () => {
    renderCombobox()

    const names = within(openList())
      .getAllByRole('option')
      .map((option) => option.textContent)

    expect(names).toEqual(['Todas', 'Somoto', 'León Norte', 'Sucursal Managua'])
  })

  it('filters the options while typing, ignoring case and accents', () => {
    renderCombobox()
    openList()

    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar Ciudad' }), {
      target: { value: 'leon' },
    })

    const names = screen.getAllByRole('option').map((option) => option.textContent)
    expect(names).toEqual(['Todas', 'León Norte'])
  })

  it('moves with the arrow keys and selects the active option with Enter', () => {
    const { onChange } = renderCombobox()
    openList()
    const search = screen.getByRole('textbox', { name: 'Buscar Ciudad' })

    fireEvent.keyDown(search, { key: 'ArrowDown' })
    fireEvent.keyDown(search, { key: 'ArrowDown' })
    fireEvent.keyDown(search, { key: 'Enter' })

    expect(onChange).toHaveBeenCalledWith('402')
  })

  it('selects the all option as no filter', () => {
    const { onChange } = renderCombobox({ value: '401' })
    openList()

    fireEvent.click(screen.getByRole('option', { name: 'Todas' }))

    expect(onChange).toHaveBeenCalledWith(undefined)
  })

  it('selects an option with a click and closes', () => {
    const { onChange } = renderCombobox()
    openList()

    fireEvent.click(screen.getByRole('option', { name: 'Somoto' }))

    expect(onChange).toHaveBeenCalledWith('401')
    expect(screen.queryByRole('listbox', { name: 'Ciudad' })).not.toBeInTheDocument()
  })

  it('closes with Escape', () => {
    renderCombobox()
    openList()

    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Buscar Ciudad' }), { key: 'Escape' })

    expect(screen.queryByRole('listbox', { name: 'Ciudad' })).not.toBeInTheDocument()
  })

  it('is fixed to the user scope when locked: disabled, with the lock hint as tooltip', () => {
    renderCombobox({ locked: true, value: '4', options: [{ value: '4', label: 'Madriz' }] })

    const trigger = screen.getByRole('combobox', { name: 'Ciudad' })
    expect(trigger).toBeDisabled()
    expect(trigger).toHaveTextContent('Madriz')
    expect(screen.getByTitle('Asignado a tu usuario')).toBeInTheDocument()
  })
})
