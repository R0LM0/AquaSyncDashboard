import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { DashboardApiProvider } from '@/app/DashboardApiProvider'
import { MockDashboardApi } from '@/adapters/mock/MockDashboardApi'
import type { Session } from '@/domain/types'
import { DashboardLayout } from './DashboardLayout'
import { useSectionContext } from './sectionContext'

const session: Session = { token: 't', usuario: 'jmedina', nombre: 'José Medina' }

/** Stands in for a map click: the same call a marker makes. */
function MapProbe() {
  const { openAccount } = useSectionContext()
  return (
    <button type="button" onClick={() => openAccount('CTA-110001')}>
      Simular clic en el mapa
    </button>
  )
}

describe('account panel wiring', () => {
  it('opens the panel with the account that asked for it', async () => {
    const api = new MockDashboardApi({ today: new Date(2026, 9, 27) })

    render(
      <DashboardApiProvider api={api}>
        <MemoryRouter initialEntries={['/resumen']}>
          <Routes>
            <Route element={<DashboardLayout session={session} onLogout={vi.fn()} />}>
              <Route path="/resumen" element={<MapProbe />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </DashboardApiProvider>,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Simular clic en el mapa' }))

    expect(await screen.findByTestId('account-panel')).toBeInTheDocument()
    expect(await screen.findByTestId('account-photos', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getByText('CTA-110001')).toBeInTheDocument()
  })
})
