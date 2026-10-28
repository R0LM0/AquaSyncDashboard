import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ExportMenu } from './ExportMenu'

function openMenu() {
  fireEvent.click(screen.getByTestId('export-trigger'))
}

describe('ExportMenu', () => {
  it('offers Excel and PDF behind one button', async () => {
    render(<ExportMenu busy={null} onExport={vi.fn()} />)

    expect(screen.getByTestId('export-trigger')).toHaveTextContent('Exportar')
    openMenu()

    expect(await screen.findByTestId('export-menu')).toBeInTheDocument()
    expect(screen.getByText('Excel')).toBeInTheDocument()
    expect(screen.getByText('PDF')).toBeInTheDocument()
  })

  it('reports which format was chosen', async () => {
    const onExport = vi.fn()
    render(<ExportMenu busy={null} onExport={onExport} />)

    openMenu()
    fireEvent.click(await screen.findByText('Excel'))
    expect(onExport).toHaveBeenLastCalledWith('excel')

    openMenu()
    fireEvent.click(await screen.findByText('PDF'))
    expect(onExport).toHaveBeenLastCalledWith('pdf')
  })

  it('shows the loading state while a report is being built', () => {
    render(<ExportMenu busy="pdf" onExport={vi.fn()} />)

    expect(screen.getByTestId('export-trigger')).toHaveTextContent('Generando reporte…')
    expect(screen.getByTestId('export-trigger')).toBeDisabled()
  })

  it('shows the row-limit warning in the menu', async () => {
    render(
      <ExportMenu busy={null} warning="El detalle tiene 20,001 cambios" onExport={vi.fn()} />,
    )

    openMenu()

    expect(await screen.findByTestId('export-warning')).toHaveTextContent('20,001')
  })
})
