import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '@/App'
import { DashboardApiProvider } from '@/app/DashboardApiProvider'
import { MockDashboardApi } from '@/adapters/mock/MockDashboardApi'
import { saveSession } from '@/features/auth/session'
import { SIDEBAR_KEY, readSidebarCollapsed, saveSidebarCollapsed } from './SidebarNav'

function renderDashboard(path = '/resumen') {
  saveSession({ token: 't', usuario: 'jmedina', nombre: 'José Medina' })
  window.history.replaceState(null, '', path)
  const api = new MockDashboardApi({ today: new Date(2026, 9, 27) })

  return render(
    <DashboardApiProvider api={api}>
      <App />
    </DashboardApiProvider>,
  )
}

describe('sidebar persistence', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('stores and restores the collapsed state', () => {
    expect(readSidebarCollapsed()).toBe(false)

    saveSidebarCollapsed(true)
    expect(localStorage.getItem(SIDEBAR_KEY)).toBe('1')
    expect(readSidebarCollapsed()).toBe(true)

    saveSidebarCollapsed(false)
    expect(readSidebarCollapsed()).toBe(false)
  })

  it('collapses from the menu button and remembers it for the next visit', async () => {
    const first = renderDashboard()
    const sidebar = await screen.findByRole('navigation', { name: 'Secciones' })

    expect(sidebar.closest('[data-collapsed]')).toHaveAttribute('data-collapsed', 'false')
    fireEvent.click(screen.getByRole('button', { name: 'Contraer menú' }))

    expect(localStorage.getItem(SIDEBAR_KEY)).toBe('1')
    first.unmount()

    renderDashboard()
    const again = await screen.findByRole('navigation', { name: 'Secciones' })
    expect(again.closest('[data-collapsed]')).toHaveAttribute('data-collapsed', 'true')
  })

  it('never offers the upcoming sections as links', async () => {
    renderDashboard()
    await screen.findByRole('navigation', { name: 'Secciones' })

    for (const label of ['Encuestas', 'Servicios nuevos', 'Metas']) {
      expect(screen.queryByRole('link', { name: new RegExp(label) })).not.toBeInTheDocument()
    }
    expect(screen.getByTestId('upcoming-encuestas')).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByTestId('upcoming-metas')).toHaveAttribute('aria-disabled', 'true')
  })
})
