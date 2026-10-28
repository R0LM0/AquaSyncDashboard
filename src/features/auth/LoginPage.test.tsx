import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardApiProvider } from '@/app/DashboardApiProvider'
import { MockDashboardApi } from '@/adapters/mock/MockDashboardApi'
import { LoginPage } from './LoginPage'
import { REMEMBERED_USER_KEY } from './rememberedUser'
import type { Session } from '@/domain/types'

function renderLogin(onAuthenticated = vi.fn()) {
  const api = new MockDashboardApi({ today: new Date(2026, 9, 27) })
  render(
    <DashboardApiProvider api={api}>
      <LoginPage onAuthenticated={onAuthenticated} />
    </DashboardApiProvider>,
  )
  return onAuthenticated
}

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows the cadastral hero, the plan legend and the animated backdrop', () => {
    renderLogin()

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Seguimiento catastral')
    // The legend explains what the backdrop draws.
    expect(screen.getByText('Lote trabajado')).toBeInTheDocument()
    expect(screen.getByText('Ubicación corregida')).toBeInTheDocument()
    expect(screen.getByText('Recorrido de la brigada')).toBeInTheDocument()
    expect(screen.getByTestId('cadastral-backdrop')).toHaveAttribute('aria-hidden', 'true')
    // Real-time tracking lives in the subtitle, never in the title.
    expect(screen.getByRole('heading', { level: 1 })).not.toHaveTextContent(/tiempo real/i)
    expect(screen.getByText(/seguimiento en tiempo real/i)).toBeInTheDocument()
    // The deployed version is visible, to confirm a new release reached the browser.
    expect(screen.getByTestId('build-info')).toHaveTextContent(/^v\d+\.\d+\.\d+/)
  })

  it('validates the empty fields', () => {
    renderLogin()

    fireEvent.click(screen.getByRole('button', { name: /ingresar/i }))

    expect(screen.getByText('El usuario es obligatorio')).toBeInTheDocument()
    expect(screen.getByText('La contraseña es obligatoria')).toBeInTheDocument()
  })

  it('remembers the username only, never the password', async () => {
    const onAuthenticated = renderLogin()

    fireEvent.change(screen.getByLabelText('Usuario'), { target: { value: 'jmedina' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'clave-secreta' } })
    fireEvent.click(screen.getByRole('button', { name: /ingresar/i }))

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalled())

    const session = onAuthenticated.mock.calls[0][0] as Session
    expect(session.usuario).toBe('jmedina')
    expect(localStorage.getItem(REMEMBERED_USER_KEY)).toBe('jmedina')
    expect(JSON.stringify({ ...localStorage })).not.toContain('clave-secreta')
  })

  it('prefills the remembered username', () => {
    localStorage.setItem(REMEMBERED_USER_KEY, 'mlopez')

    renderLogin()

    expect(screen.getByLabelText('Usuario')).toHaveValue('mlopez')
    expect(screen.getByLabelText('Contraseña')).toHaveValue('')
  })

  it('warns when Caps Lock is on', () => {
    vi.spyOn(KeyboardEvent.prototype, 'getModifierState').mockReturnValue(true)
    renderLogin()

    fireEvent.keyDown(screen.getByLabelText('Contraseña'), { key: 'A' })

    expect(screen.getByText(/mayúsculas activado/i)).toBeInTheDocument()
  })

  it('shows the API error and keeps the user on the form', async () => {
    const api = new MockDashboardApi({ today: new Date(2026, 9, 27) })
    vi.spyOn(api, 'login').mockRejectedValue(new Error('Usuario o contraseña incorrectos'))
    render(
      <DashboardApiProvider api={api}>
        <LoginPage onAuthenticated={vi.fn()} />
      </DashboardApiProvider>,
    )

    fireEvent.change(screen.getByLabelText('Usuario'), { target: { value: 'jmedina' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'mala' } })
    fireEvent.click(screen.getByRole('button', { name: /ingresar/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Usuario o contraseña incorrectos')
  })
})
