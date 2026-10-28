import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { DashboardApiProvider } from '@/app/DashboardApiProvider'
import { MockDashboardApi } from '@/adapters/mock/MockDashboardApi'
import type { Session } from '@/domain/types'
import type { RuntimeEnvironment } from '@/app/runtimeEnvironment'
import { DashboardLayout } from './DashboardLayout'

const session: Session = { token: 't', usuario: 'jmedina', nombre: 'José Medina' }

function renderLayout(environment: RuntimeEnvironment) {
  const api = new MockDashboardApi({ today: new Date(2026, 9, 27) })

  return render(
    <DashboardApiProvider api={api}>
      <MemoryRouter initialEntries={['/resumen']}>
        <Routes>
          <Route
            element={
              <DashboardLayout session={session} onLogout={vi.fn()} environment={environment} />
            }
          >
            <Route path="/resumen" element={<p>contenido</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </DashboardApiProvider>,
  )
}

describe('test data band', () => {
  it('warns on top of the whole dashboard in the test environment', () => {
    renderLayout('pruebas')

    expect(screen.getByTestId('test-data-band')).toHaveTextContent('Estás viendo datos de pruebas')
    expect(screen.getByTestId('environment-chip')).toHaveTextContent('PRUEBAS')
  })

  it('stays out of the way in production', () => {
    renderLayout('produccion')

    expect(screen.queryByTestId('test-data-band')).not.toBeInTheDocument()
    expect(screen.getByTestId('environment-chip')).toHaveTextContent('PRODUCCIÓN')
  })
})
