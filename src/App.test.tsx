import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { DashboardApiProvider } from './app/DashboardApiProvider'
import { MockDashboardApi } from './adapters/mock/MockDashboardApi'
import { ALCANCE_PAIS } from './domain/alcance'
import { saveSession, sessionKey } from './features/auth/session'

const ENVIRONMENT = 'pruebas' as const

function renderAt(path: string) {
  window.history.replaceState(null, '', path)
  return render(
    <DashboardApiProvider api={new MockDashboardApi({ today: new Date(2026, 9, 27) })}>
      <App environment={ENVIRONMENT} />
    </DashboardApiProvider>,
  )
}

function currentPath() {
  return window.location.pathname + window.location.search
}

describe('session redirects', () => {
  beforeEach(() => {
    sessionStorage.removeItem(sessionKey(ENVIRONMENT))
    localStorage.clear()
  })

  it('sends a visitor without session from any path to /login, with no query string', async () => {
    renderAt('/avance-por-ruta?filial=01')

    expect(await screen.findByLabelText('Usuario')).toBeInTheDocument()
    expect(currentPath()).toBe('/login')
  })

  it('sends a visitor with a session away from /login to /resumen', async () => {
    saveSession({ token: 't', usuario: 'jmedina', nombre: 'J', alcance: ALCANCE_PAIS }, ENVIRONMENT)

    renderAt('/login')

    await waitFor(() => expect(currentPath()).toBe('/resumen'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Resumen' })).toBeInTheDocument()
  })

  it('sends the user to /login when the session is cleared while the app is open', async () => {
    saveSession({ token: 't', usuario: 'jmedina', nombre: 'J', alcance: ALCANCE_PAIS }, ENVIRONMENT)
    renderAt('/mapa')
    expect(await screen.findByRole('heading', { level: 1, name: 'Mapa' })).toBeInTheDocument()

    act(() => {
      sessionStorage.removeItem(sessionKey(ENVIRONMENT))
      window.dispatchEvent(new Event('storage'))
    })
    const logout = await screen.findByRole('button', { name: /salir/i })
    act(() => logout.click())

    await waitFor(() => expect(currentPath()).toBe('/login'))
  })
})
