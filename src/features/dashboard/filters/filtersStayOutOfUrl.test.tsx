import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '@/App'
import { DashboardApiProvider } from '@/app/DashboardApiProvider'
import { MockDashboardApi } from '@/adapters/mock/MockDashboardApi'
import { ALCANCE_PAIS } from '@/domain/alcance'
import { saveSession } from '@/features/auth/session'
import { FILTERS_STORAGE_KEY, readStoredFilters } from './filtersStorage'

function renderDashboard() {
  saveSession({ token: 't', usuario: 'jmedina', nombre: 'José Medina', alcance: ALCANCE_PAIS })
  window.history.replaceState(null, '', '/resumen')
  const api = new MockDashboardApi({ today: new Date(2026, 9, 27) })

  render(
    <DashboardApiProvider api={api}>
      <App />
    </DashboardApiProvider>,
  )
}

describe('filters never reach the address bar', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
    window.history.replaceState(null, '', '/resumen')
  })

  it('keeps the URL clean on load and stores the range in the tab', { timeout: 30_000 }, async () => {
    renderDashboard()

    await screen.findByText('Actividad diaria', {}, { timeout: 8_000 })

    expect(window.location.search).toBe('')
    expect(window.location.pathname).toBe('/resumen')
    expect(readStoredFilters()).toMatchObject({
      desde: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      hasta: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    })
  })

  it('still keeps the URL clean after changing a filter', { timeout: 30_000 }, async () => {
    renderDashboard()
    await screen.findByText('Actividad diaria', {}, { timeout: 8_000 })

    fireEvent.click(screen.getByRole('button', { name: /filtros/i }))
    const desde = screen.getAllByLabelText('Desde')[0]
    fireEvent.change(desde, { target: { value: '2026-10-20' } })

    await waitFor(() => expect(readStoredFilters()?.desde).toBe('2026-10-20'))
    expect(window.location.search).toBe('')
    expect(sessionStorage.getItem(FILTERS_STORAGE_KEY)).toContain('2026-10-20')
  })
})
