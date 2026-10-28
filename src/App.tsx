import { useCallback, useState } from 'react'
import { LoginPage } from './features/auth/LoginPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { clearSession, readSession } from './features/auth/session'
import type { Session } from './domain/types'

function App() {
  const [session, setSession] = useState<Session | null>(() => readSession())

  const handleLogout = useCallback(() => {
    clearSession()
    setSession(null)
  }, [])

  if (!session) return <LoginPage onAuthenticated={setSession} />

  return <DashboardPage session={session} onLogout={handleLogout} />
}

export default App
