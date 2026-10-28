import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../App'
import { DashboardApiProvider } from './DashboardApiProvider'
import { MockDashboardApi } from '../adapters/mock/MockDashboardApi'
import { SESSION_KEY } from '../features/auth/session'

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
    sessionStorage.removeItem(SESSION_KEY)
    window.history.replaceState(null, '', '/')
  })

  it('shows validation when the fields are empty', () => {
    renderApp()

    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(screen.getByText('El usuario es obligatorio')).toBeInTheDocument()
    expect(screen.getByText('La contraseña es obligatoria')).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'SIGIL · Seguimiento catastral' }),
    ).not.toBeInTheDocument()
  })

  it('shows the dashboard after a successful login', async () => {
    renderApp()

    fireEvent.change(screen.getByLabelText('Usuario'), { target: { value: 'jmedina' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'clave' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByText('SIGIL · Seguimiento catastral')).toBeInTheDocument()
    expect(await screen.findByTestId('kpi-cuentasTrabajadas')).toBeInTheDocument()
    expect(screen.getByTestId('environment-badge')).toHaveTextContent('AMBIENTE DE PRUEBAS')
    expect(JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? '{}')).toMatchObject({
      usuario: 'jmedina',
    })
  })
})
