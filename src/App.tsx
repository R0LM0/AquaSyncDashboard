import { useCallback, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import type { Session } from '@/domain/types'
import { clearSession, readSession } from '@/features/auth/session'
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

  if (!session) {
    return (
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

  return (
    <BrowserRouter>
      <Routes>
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
      </Routes>
    </BrowserRouter>
  )
}

export default App
