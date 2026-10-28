import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../App'
import { DashboardApiProvider } from './DashboardApiProvider'
import { MockDashboardApi } from '../adapters/mock/MockDashboardApi'
import { sessionKey } from '../features/auth/session'

function renderApp() {
  const api = new MockDashboardApi({ today: new Date(2026, 9, 27) })
  return render(
    <DashboardApiProvider api={api}>
      <App />
    </DashboardApiProvider>,
  )
}

describe('login', () => {
  beforeEach(() => {
    sessionStorage.removeItem(sessionKey('pruebas'))
    localStorage.clear()
    window.history.replaceState(null, '', '/')
  })

  it('shows validation when the fields are empty', async () => {
    renderApp()

    fireEvent.click(await screen.findByRole('button', { name: 'Ingresar' }))

    expect(screen.getByText('El usuario es obligatorio')).toBeInTheDocument()
    expect(screen.getByText('La contraseña es obligatoria')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1, name: 'Resumen' })).not.toBeInTheDocument()
  })

  it('shows the dashboard shell after a successful login', async () => {
    renderApp()

    fireEvent.change(await screen.findByLabelText('Usuario'), { target: { value: 'jmedina' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'clave' } })
    fireEvent.click(screen.getByRole('button', { name: /ingresar/i }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Resumen' })).toBeInTheDocument()
    expect(await screen.findByTestId('kpi-cuentasTrabajadas', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getByTestId('environment-chip')).toBeInTheDocument()
    expect(screen.getByTestId('live-status-topbar')).toBeInTheDocument()
    expect(JSON.parse(sessionStorage.getItem(sessionKey('pruebas')) ?? '{}')).toMatchObject({
      usuario: 'jmedina',
    })
  })
})
