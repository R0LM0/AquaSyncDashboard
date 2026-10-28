import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { UserRouteProgress } from '@/domain/types'
import { UserRouteTable } from './UserRouteTable'

const progress: UserRouteProgress[] = [
  {
    usuario: 'jperez',
    filial: '01',
    zona: '02',
    ruta: '590-1-12',
    cuentasRuta: 177,
    cuentasTrabajadas: 166,
    fotos: 120,
    ubicaciones: 46,
    ultimaActividad: '2026-10-27T15:00:00Z',
  },
]

describe('UserRouteTable', () => {
  it('keeps the rows static when no route selection is given', () => {
    render(<UserRouteTable progress={progress} />)

    const row = screen.getByText('jperez').closest('tr') as HTMLElement
    expect(row).not.toHaveAttribute('tabindex')
    fireEvent.click(row)
    expect(screen.getByText('590-1-12')).toBeInTheDocument()
  })

  it('reports the clicked row when a route selection is given', () => {
    const onSelectRoute = vi.fn()
    render(<UserRouteTable progress={progress} onSelectRoute={onSelectRoute} />)

    fireEvent.click(screen.getByText('jperez').closest('tr') as HTMLElement)

    expect(onSelectRoute).toHaveBeenCalledWith(
      expect.objectContaining({ usuario: 'jperez', filial: '01', zona: '02', ruta: '590-1-12' }),
    )
  })
})
