import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChangesTable } from './ChangesTable'

describe('ChangesTable', () => {
  it('shows the endpoint error instead of an empty table', () => {
    render(
      <ChangesTable page={undefined} pageNumber={1} pageSize={15} onPageChange={vi.fn()} error="Rango inválido" />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Rango inválido')
  })

  it('paginates the rows it receives', () => {
    render(
      <ChangesTable
        page={{
          total: 40,
          rows: [
            {
              id: '1',
              fecha: '2026-10-27T19:42:10Z',
              usuario: 'jperez',
              cuenta: '5012',
              cliente: 'MARIA GONZALEZ',
              filial: '01',
              zona: '02',
              ruta: '03',
              tipoCambio: 'FotoNueva',
              origen: 'online',
            },
          ],
        }}
        pageNumber={2}
        pageSize={15}
        onPageChange={vi.fn()}
      />,
    )

    expect(screen.getByText(/Página 2 de 3/)).toBeInTheDocument()
    expect(screen.getByText('MARIA GONZALEZ')).toBeInTheDocument()
    expect(screen.getByText('Foto nueva')).toBeInTheDocument()
  })
})
