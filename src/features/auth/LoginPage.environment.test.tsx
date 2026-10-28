import { ALCANCE_PAIS } from '@/domain/alcance'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardApiProvider } from '@/app/DashboardApiProvider'
import { MockDashboardApi } from '@/adapters/mock/MockDashboardApi'
import { clearSession, readSession, saveSession, sessionKey } from './session'
import { LoginPage } from './LoginPage'

function renderLogin(props: Partial<Parameters<typeof LoginPage>[0]> = {}) {
  const api = new MockDashboardApi({ today: new Date(2026, 9, 27) })
  const onEnvironmentChange = vi.fn()

  render(
    <DashboardApiProvider api={api}>
      <LoginPage
        onAuthenticated={vi.fn()}
        environment="produccion"
        switchable
        onEnvironmentChange={onEnvironmentChange}
        {...props}
      />
    </DashboardApiProvider>,
  )

  return { onEnvironmentChange }
}

describe('environment switch on the login', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('offers Pruebas and Producción with Producción selected', () => {
    renderLogin()

    const group = screen.getByRole('radiogroup', { name: 'Ambiente' })
    expect(group).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Producción' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Pruebas' })).not.toBeChecked()
  })

  it('reports the chosen environment', () => {
    const { onEnvironmentChange } = renderLogin()

    fireEvent.click(screen.getByRole('radio', { name: 'Pruebas' }))

    expect(onEnvironmentChange).toHaveBeenCalledWith('pruebas')
  })

  it('marks the current environment without printing the server address', () => {
    renderLogin({ environment: 'pruebas' })

    expect(screen.getByRole('radio', { name: 'Pruebas' })).toBeChecked()
    // The login must not advertise which server it talks to; the header chip does.
    expect(screen.queryByText(/se conecta al servidor/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/:7050/)).not.toBeInTheDocument()
    expect(screen.queryByText(/:8070/)).not.toBeInTheDocument()
  })

  it('hides the switch when the build fixes the environment', () => {
    renderLogin({ switchable: false, onEnvironmentChange: undefined })

    expect(screen.queryByRole('radiogroup', { name: 'Ambiente' })).not.toBeInTheDocument()
    expect(screen.getByTestId('environment-fixed')).toBeInTheDocument()
  })

  it('logs in against the selected environment only', async () => {
    const onAuthenticated = vi.fn()
    renderLogin({ environment: 'pruebas', onAuthenticated })

    saveSession(
      { token: 'token-produccion', usuario: 'jmedina', nombre: 'José Medina', alcance: ALCANCE_PAIS },
      'produccion',
    )

    fireEvent.change(screen.getByLabelText('Usuario'), { target: { value: 'jmedina' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'clave' } })
    fireEvent.click(screen.getByRole('button', { name: /ingresar/i }))

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalled())

    expect(readSession('pruebas')?.usuario).toBe('jmedina')
    expect(readSession('produccion')?.token).toBe('token-produccion')
    expect(sessionKey('pruebas')).not.toBe(sessionKey('produccion'))
  })
})

describe('sessions per environment', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('never reuses the token of the other environment', () => {
    saveSession({ token: 'token-pruebas', usuario: 'jmedina', nombre: 'José Medina', alcance: ALCANCE_PAIS }, 'pruebas')

    expect(readSession('pruebas')?.token).toBe('token-pruebas')
    expect(readSession('produccion')).toBeNull()
  })

  it('logging out only closes the current environment', () => {
    saveSession({ token: 'token-pruebas', usuario: 'jmedina', nombre: 'José Medina', alcance: ALCANCE_PAIS }, 'pruebas')
    saveSession({ token: 'token-produccion', usuario: 'jmedina', nombre: 'José Medina', alcance: ALCANCE_PAIS }, 'produccion')

    clearSession('pruebas')

    expect(readSession('pruebas')).toBeNull()
    expect(readSession('produccion')?.token).toBe('token-produccion')
  })
})
