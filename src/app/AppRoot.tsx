import { useCallback, useMemo, useState } from 'react'
import { createDashboardApi } from './createDashboardApi'
import { DashboardApiProvider } from './DashboardApiProvider'
import App from '@/App'
import { readSession } from '@/features/auth/session'
import {
  resolveRuntimeEnvironment,
  saveRuntimeEnvironment,
  type RuntimeEnvironment,
} from './runtimeEnvironment'

/**
 * Owns the runtime environment: the adapter is rebuilt when it changes, with the
 * token of that environment only.
 */
export function AppRoot() {
  const [environment, setEnvironment] = useState<RuntimeEnvironment>(() =>
    resolveRuntimeEnvironment(import.meta.env),
  )

  const api = useMemo(
    () => createDashboardApi({ environment, token: readSession(environment)?.token }),
    [environment],
  )

  const handleEnvironmentChange = useCallback((next: RuntimeEnvironment) => {
    saveRuntimeEnvironment(next)
    setEnvironment(next)
  }, [])

  return (
    <DashboardApiProvider api={api}>
      <App environment={environment} onEnvironmentChange={handleEnvironmentChange} />
    </DashboardApiProvider>
  )
}
