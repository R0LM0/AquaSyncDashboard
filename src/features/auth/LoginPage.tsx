import { useCallback, useState } from 'react'
import type { FormEvent } from 'react'
import { useDashboardApi } from '../../app/dashboardApiContext'
import type { Session } from '../../domain/types'
import { saveSession } from './session'

export function LoginPage({ onAuthenticated }: { onAuthenticated: (session: Session) => void }) {
  const api = useDashboardApi()
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ usuario?: string; password?: string }>({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      const errors: { usuario?: string; password?: string } = {}
      if (!usuario.trim()) errors.usuario = 'El usuario es obligatorio'
      if (!password.trim()) errors.password = 'La contraseña es obligatoria'
      setFieldErrors(errors)
      if (errors.usuario || errors.password) {
        setError('')
        return
      }

      setSubmitting(true)
      setError('')
      try {
        const session = await api.login(usuario.trim(), password)
        saveSession(session)
        onAuthenticated(session)
      } catch (loginError) {
        setError(loginError instanceof Error ? loginError.message : 'No se pudo iniciar sesión')
      } finally {
        setSubmitting(false)
      }
    },
    [api, onAuthenticated, password, usuario],
  )

  return (
    <main className="login">
      <section className="login__card">
        <header className="login__header">
          <p className="login__eyebrow">ENACAL · SIGIL</p>
          <h1>Iniciar sesión</h1>
          <p className="login__subtitle">Seguimiento catastral del trabajo de campo con AquaSync</p>
        </header>

        <form className="login__form" onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span>Usuario</span>
            <input
              name="usuario"
              autoComplete="username"
              value={usuario}
              onChange={(event) => setUsuario(event.target.value)}
              aria-invalid={Boolean(fieldErrors.usuario)}
            />
            {fieldErrors.usuario ? <small className="field__error">{fieldErrors.usuario}</small> : null}
          </label>

          <label className="field">
            <span>Contraseña</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(fieldErrors.password)}
            />
            {fieldErrors.password ? (
              <small className="field__error">{fieldErrors.password}</small>
            ) : null}
          </label>

          {error ? (
            <p className="alert alert--error" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" className="button button--primary" disabled={submitting}>
            {submitting ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <footer className="login__footer">
          Usá las mismas credenciales de SIGIL. La sesión se cierra al cerrar la pestaña.
        </footer>
      </section>
    </main>
  )
}
