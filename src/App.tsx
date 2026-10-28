import { useCallback, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import type { Session } from '@/domain/types'
import { clearSession, readSession, tokenExpiresAt } from '@/features/auth/session'
import { DashboardLayout } from '@/features/dashboard/DashboardLayout'
import {
  MapaPage,
  ReportesPage,
  ResumenPage,
  RutasPage,
  UsuariosPage,
} from '@/features/dashboard/sections'
import {
  resolveRuntimeEnvironment,
  type RuntimeEnvironment,
} from './app/runtimeEnvironment'

/** The largest delay a setTimeout accepts (about 24.8 days). */
const MAX_TIMER_DELAY_MS = 2_147_483_647

// The login (scene + form) is its own chunk: it is only needed before signing in.
const LoginPage = lazy(() =>
  import('@/features/auth/LoginPage').then((module) => ({ default: module.LoginPage })),
)

export interface AppProps {
  /** Runtime environment chosen on the login (production build switch). */
  environment?: RuntimeEnvironment
  onEnvironmentChange?: (environment: RuntimeEnvironment) => void
}

function App({ environment, onEnvironmentChange }: AppProps = {}) {
  const current = environment ?? resolveRuntimeEnvironment(import.meta.env)
  const [auth, setAuth] = useState<{ environment: string; session: Session | null }>(() => ({
    environment: current,
    session: readSession(current),
  }))

  // Each environment has its own token: the session follows the switch, derived
  // during render instead of being copied into state by an effect.
  const session = auth.environment === current ? auth.session : readSession(current)

  const handleLogout = useCallback(() => {
    clearSession(current)
    setAuth({ environment: current, session: null })
  }, [current])

  const handleAuthenticated = useCallback(
    (next: Session) => setAuth({ environment: current, session: next }),
    [current],
  )

  // The session ends at its token exp: the timer clears it and the routes send the user to /login.
  // A delay past the timer limit is not armed; the 401 handling still closes the session then.
  useEffect(() => {
    if (!session) return

    const expiresAt = tokenExpiresAt(session.token)
    if (expiresAt === undefined) return

    const delay = expiresAt - Date.now()
    if (delay > MAX_TIMER_DELAY_MS) return

    const timer = setTimeout(handleLogout, Math.max(0, delay))
    return () => clearTimeout(timer)
  }, [session, handleLogout])

  // No query strings anywhere: the redirects are plain paths, replaced in history.
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            session ? (
              <Navigate to="/resumen" replace />
            ) : (
              <Suspense
                fallback={
                  <div className="grid min-h-screen place-items-center bg-bg text-sm font-semibold text-muted-fg">
                    Cargando SIGIL…
                  </div>
                }
              >
                <LoginPage
                  environment={current}
                  onEnvironmentChange={onEnvironmentChange}
                  onAuthenticated={handleAuthenticated}
                />
              </Suspense>
            )
          }
        />
        {session ? (
          <Route
            element={
              <DashboardLayout
                session={session}
                onLogout={handleLogout}
                environment={current}
              />
            }
          >
            <Route index element={<Navigate to="/resumen" replace />} />
            <Route path="/resumen" element={<ResumenPage />} />
            <Route path="/mapa" element={<MapaPage />} />
            <Route path="/avance-por-ruta" element={<RutasPage />} />
            <Route path="/usuarios" element={<UsuariosPage />} />
            <Route path="/detalle-y-reportes" element={<ReportesPage />} />
            <Route path="*" element={<Navigate to="/resumen" replace />} />
          </Route>
        ) : null}
        <Route path="*" element={<Navigate to={session ? '/resumen' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
