import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardApiProvider } from '@/app/DashboardApiProvider'
import { MockDashboardApi } from '@/adapters/mock/MockDashboardApi'
import { MapPanel } from './MapPanel'
import { MAP_PREFERENCES_KEY, readMapPreferences } from './mapPreferences'
import type { MapPoint } from '@/domain/types'

const point: MapPoint = {
  cuenta: 'CTA-110001',
  cliente: 'MARIA GONZALEZ',
  lat: 12.1364,
  lng: -86.2514,
  tipoCambio: 'FotoNueva',
  usuario: 'jmedina',
  fecha: '2026-10-27T10:00:00Z',
}

function renderPanel(options: {
  points?: MapPoint[]
  fitKey?: string
  onSelectAccount?: (cuenta: string) => void
} = {}) {
  const onSelectAccount = options.onSelectAccount ?? vi.fn()
  const api = new MockDashboardApi({ today: new Date(2026, 9, 27) })

  const view = render(
    <DashboardApiProvider api={api}>
      <MapPanel
        points={options.points ?? [point]}
        fitKey={options.fitKey ?? 'filters-a'}
        onSelectAccount={onSelectAccount}
        height={320}
      />
    </DashboardApiProvider>,
  )

  return { onSelectAccount, view }
}

function openPopover() {
  fireEvent.click(screen.getByRole('button', { name: 'Capas del mapa' }))
  return screen.getByTestId('map-layers-popover')
}

describe('MapPanel layers popover', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('opens the grouped popover from one icon', async () => {
    renderPanel()

    const popover = openPopover()

    expect(await screen.findByText('Mapa base')).toBeInTheDocument()
    expect(popover).toHaveTextContent('Límites')
    expect(popover).toHaveTextContent('Catastro')
    expect(popover).toHaveTextContent('Trabajo de campo')
    expect(screen.getByRole('radio', { name: 'OpenStreetMap' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Satélite' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Cambios' })).toBeInTheDocument()
  })

  it('closes with Escape', async () => {
    renderPanel()
    openPopover()

    expect(await screen.findByTestId('map-layers-popover')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() => expect(screen.queryByTestId('map-layers-popover')).not.toBeInTheDocument())
  })

  it('persists the selected layers and the base map', async () => {
    const first = renderPanel()
    openPopover()

    fireEvent.click(await screen.findByRole('checkbox', { name: 'Cambios' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Satélite' }))

    const stored = readMapPreferences()
    expect(stored.visible.cambios).toBe(false)
    expect(stored.baseMap).toBe('satellite')
    expect(localStorage.getItem(MAP_PREFERENCES_KEY)).toContain('satellite')

    first.view.unmount()
    renderPanel()
    openPopover()

    expect(await screen.findByRole('checkbox', { name: 'Cambios' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'Satélite' })).toBeChecked()
  })

  it('disables the lots layer below zoom 15 and explains why', async () => {
    renderPanel()
    openPopover()

    const predios = await screen.findByRole('checkbox', { name: 'Predios' })
    expect(predios).toBeDisabled()
    expect(screen.getByTestId('map-layers-popover')).toHaveTextContent('Visible desde zoom 15')
    expect(screen.getByTestId('predios-hint')).toHaveTextContent('Acerque el mapa para ver predios')
  })

  it('does not overlap the zoom controls with the layer control', () => {
    renderPanel()

    const layerButton = screen.getByRole('button', { name: 'Capas del mapa' })
    const center = screen.getByRole('button', { name: 'Centrar en Nicaragua' })

    expect(layerButton.parentElement?.className).toContain('top-[92px]')
    expect(center.parentElement?.className).toContain('top-3')
  })

  it('reports the clicked marker account', async () => {
    const { onSelectAccount } = renderPanel()

    await waitFor(() => expect(document.querySelectorAll('.map-pin').length).toBeGreaterThan(0))
    fireEvent.click(document.querySelector('.map-pin') as HTMLElement)

    await waitFor(() => expect(onSelectAccount).toHaveBeenCalledWith('CTA-110001'))
  })
})
