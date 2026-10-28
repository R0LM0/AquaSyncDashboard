import { useCallback, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Moon,
  Sun,
  User,
} from 'lucide-react'
import { useDashboardApi } from '@/app/dashboardApiContext'
import {
  ENVIRONMENT_LABELS,
  isEnvironmentSwitchable,
  resolveRuntimeEnvironment,
  type RuntimeEnvironment,
} from '@/app/runtimeEnvironment'
import { useTheme } from '@/app/theme'
import { EnvironmentChip } from '@/components/EnvironmentChip'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { errorMessage } from '@/domain/errors'
import type { Session } from '@/domain/types'
import { buildInfo, formatBuildInfo } from '@/app/buildInfo'
import { CadastralBackdrop } from './CadastralBackdrop'
import { saveRememberedUser, readRememberedUser } from './rememberedUser'
import { saveSession } from './session'

/** Legend of the backdrop: explains what the animated cadastral plan shows. */
const LEGEND = [
  { key: 'worked', label: 'Lote trabajado', swatch: 'size-3 rounded-[3px] border border-primary/70 bg-primary/30' },
  { key: 'corrected', label: 'Ubicación corregida', swatch: 'size-3 rounded-[3px] border border-accent/70 bg-accent/30' },
  { key: 'crew', label: 'Recorrido de la brigada', swatch: 'h-0 w-5 border-t-2 border-dashed border-primary/80' },
]

export interface LoginPageProps {
  onAuthenticated: (session: Session) => void
  environment?: RuntimeEnvironment
  onEnvironmentChange?: (environment: RuntimeEnvironment) => void
  /** Overridable for tests; by default only the production build switches. */
  switchable?: boolean
}

export function LoginPage({
  onAuthenticated,
  environment,
  onEnvironmentChange,
  switchable: switchableProp,
}: LoginPageProps) {
  const currentEnvironment = environment ?? resolveRuntimeEnvironment(import.meta.env)
  const switchable = switchableProp ?? isEnvironmentSwitchable(import.meta.env)
  const api = useDashboardApi()
  const { theme, toggleTheme } = useTheme()
  const usuarioId = useId()
  const passwordId = useId()

  const [usuario, setUsuario] = useState(() => readRememberedUser())
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ usuario?: string; password?: string }>({})
  const [error, setError] = useState('')
  const [errorKey, setErrorKey] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

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
        saveRememberedUser(usuario)
        saveSession(session, currentEnvironment)
        onAuthenticated(session)
      } catch (loginError) {
        setError(errorMessage(loginError, 'No se pudo iniciar sesión'))
        setErrorKey((current) => current + 1)
      } finally {
        setSubmitting(false)
      }
    },
    [api, currentEnvironment, onAuthenticated, password, usuario],
  )

  const handlePasswordKey = (event: KeyboardEvent<HTMLInputElement>) => {
    const caps = typeof event.getModifierState === 'function' ? event.getModifierState('CapsLock') : false
    setCapsLock(caps)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg">
      <CadastralBackdrop className="opacity-60 lg:opacity-100 lg:[mask-image:linear-gradient(90deg,#000_0%,#000_38%,transparent_78%)]" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(640px 420px at 22% 38%, hsl(var(--bg) / 0), hsl(var(--bg) / 0.55) 70%), linear-gradient(90deg, transparent 45%, hsl(var(--bg) / 0.92) 72%)',
        }}
      />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <span className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="" className="size-7" />
            <span className="text-sm font-extrabold tracking-tight text-fg">AquaSync Catastro</span>
            <span className="hidden text-sm text-muted-fg sm:inline">ENACAL</span>
          </span>
          <div className="flex items-center gap-2">
            <EnvironmentChip />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            >
              {theme === 'dark' ? <Sun /> : <Moon />}
            </Button>
          </div>
        </header>

        <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_minmax(340px,400px)] lg:gap-16">
          <section className="flex flex-col gap-6" aria-labelledby="hero-title">
            <h1
              id="hero-title"
              className="max-w-xl text-4xl font-extrabold leading-[1.02] tracking-[-0.03em] text-fg sm:text-6xl"
            >
              Seguimiento catastral
            </h1>

            <p className="max-w-md text-base leading-relaxed text-muted-fg sm:text-lg">
              Lo que ENACAL registra en campo con AquaSync, con seguimiento en tiempo real por
              unidad de gestión, sucursal y ruta.
            </p>

            <figure className="mt-2 hidden w-fit rounded-2xl border border-border-subtle bg-bg/70 px-4 py-3 backdrop-blur-sm lg:block">
              <figcaption className="mb-2 text-xs text-muted-fg">Lo que ves en el plano</figcaption>
              <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {LEGEND.map(({ key, label, swatch }) => (
                  <li key={key} className="flex items-center gap-2 text-sm text-fg">
                    <span aria-hidden="true" className={swatch} />
                    {label}
                  </li>
                ))}
              </ul>
            </figure>
          </section>

          <section className="mx-auto w-full max-w-md lg:mx-0" aria-labelledby="login-title">
            <div ref={cardRef} className="glass-card glow-primary p-6 sm:p-8">
              <div className="mb-6 space-y-1.5">
                <h2 id="login-title" className="text-2xl font-extrabold tracking-tight text-fg">
                  Iniciar sesión
                </h2>
                <p className="text-sm text-muted-fg">Entrá con tu usuario y contraseña de SIGIL.</p>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                <div className="space-y-1.5">
                  <label htmlFor={usuarioId} className="text-sm font-semibold text-fg">
                    Usuario
                  </label>
                  <Input
                    id={usuarioId}
                    name="usuario"
                    autoComplete="username"
                    placeholder="jperez"
                    icon={<User />}
                    value={usuario}
                    onChange={(event) => setUsuario(event.target.value)}
                    aria-invalid={Boolean(fieldErrors.usuario)}
                  />
                  {fieldErrors.usuario ? (
                    <p className="text-xs font-medium text-danger">{fieldErrors.usuario}</p>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor={passwordId} className="text-sm font-semibold text-fg">
                    Contraseña
                  </label>
                  <Input
                    id={passwordId}
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    icon={<Lock />}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    onKeyDown={handlePasswordKey}
                    onKeyUp={handlePasswordKey}
                    aria-invalid={Boolean(fieldErrors.password)}
                    trailing={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowPassword((current) => !current)}
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      >
                        {showPassword ? <EyeOff /> : <Eye />}
                      </Button>
                    }
                  />
                  {fieldErrors.password ? (
                    <p className="text-xs font-medium text-danger">{fieldErrors.password}</p>
                  ) : null}
                  {capsLock ? (
                    <p className="flex items-center gap-1.5 text-xs font-medium text-warning">
                      <AlertCircle className="size-3.5" aria-hidden="true" />
                      Mayúsculas activado
                    </p>
                  ) : null}
                </div>

                {error ? (
                  <p
                    key={errorKey}
                    role="alert"
                    className="animate-shake flex items-start gap-2 rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm font-medium text-danger"
                  >
                    <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    {error}
                  </p>
                ) : null}

                {switchable ? (
                  <div className="space-y-1.5" data-testid="environment-switch">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-fg">
                      Ambiente
                    </span>
                    <div
                      role="radiogroup"
                      aria-label="Ambiente"
                      className="grid grid-cols-2 gap-1 rounded-xl border border-border-subtle bg-surface-2/60 p-1"
                    >
                      {(['pruebas', 'produccion'] as const).map((option) => (
                        <button
                          key={option}
                          type="button"
                          role="radio"
                          aria-checked={currentEnvironment === option}
                          onClick={() => onEnvironmentChange?.(option)}
                          className={currentEnvironment === option
                            ? 'h-9 rounded-lg bg-primary text-sm font-bold text-primary-fg shadow-[0_6px_18px_-8px_hsl(var(--primary)/0.9)]'
                            : 'h-9 rounded-lg text-sm font-bold text-muted-fg transition-colors hover:text-fg'}
                        >
                          {option === 'pruebas' ? 'Pruebas' : 'Producción'}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-fg">
                      {currentEnvironment === 'pruebas'
                        ? `Se conecta al servidor de ${ENVIRONMENT_LABELS.pruebas.toLowerCase()} (:7050).`
                        : `Se conecta al servidor de ${ENVIRONMENT_LABELS.produccion.toLowerCase()} (:8070).`}
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-fg" data-testid="environment-fixed">
                    El ambiente lo define este build.
                  </p>
                )}

                <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Ingresando…
                    </>
                  ) : (
                    'Ingresar'
                  )}
                </Button>
              </form>

              <p className="mt-5 border-t border-border-subtle pt-4 text-xs text-muted-fg">
                Este equipo recuerda solo tu usuario. La sesión se cierra al cerrar la pestaña.
              </p>
            </div>
            <p className="mt-3 text-center text-[11px] text-muted-fg/80" data-testid="build-info">
              {formatBuildInfo(buildInfo)}
            </p>
          </section>
        </main>
      </div>
    </div>
  )
}
