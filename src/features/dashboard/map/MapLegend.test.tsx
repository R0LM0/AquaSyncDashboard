import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MapLegend } from './MapLegend'

describe('MapLegend predios section', () => {
  it('adds the predio states only while the Predios layer is on', () => {
    const { unmount } = render(<MapLegend />)
    expect(screen.queryByText('Predios')).not.toBeInTheDocument()
    unmount()

    render(<MapLegend predios />)
    expect(screen.getByText('Predios')).toBeInTheDocument()
    expect(screen.getByText('Trabajado en el período')).toBeInTheDocument()
    expect(screen.getByText('Cuenta vinculada')).toBeInTheDocument()
    expect(screen.getByText('Cuenta sin ubicación')).toBeInTheDocument()
    expect(screen.getByText('Sin cuenta asociada')).toBeInTheDocument()
  })
})
