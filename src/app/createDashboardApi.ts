import { HttpDashboardApi } from '../adapters/http/HttpDashboardApi'
import { MockDashboardApi } from '../adapters/mock/MockDashboardApi'
import type { DashboardApi } from '../ports/DashboardApi'
import { resolveApiUrl, type LocationLike } from './apiUrl'
import type { RuntimeEnvironment } from './runtimeEnvironment'

export interface CreateDashboardApiOptions {
  env?: ImportMetaEnv
  location?: LocationLike
  /** Token restored from sessionStorage, so a reload keeps the session alive. */
  token?: string
  /** Runtime environment: a production build picks the API port with it. */
  environment?: RuntimeEnvironment
}

/**
 * Picks the adapter from the environment: `VITE_API_MODE=mock` (default) or
 * `http`. The screens only ever see the port.
 */
export function createDashboardApi(options: CreateDashboardApiOptions = {}): DashboardApi {
  const env = options.env ?? import.meta.env

  if (env.VITE_API_MODE === 'http') {
    const location = options.location ?? window.location
    return new HttpDashboardApi(
      resolveApiUrl(location, env, options.environment),
      options.token ?? '',
    )
  }

  return new MockDashboardApi()
}

/** `AMBIENTE DE PRUEBAS` badge: anything that is not the production build. */
export function isNonProductionMode(env: ImportMetaEnv = import.meta.env): boolean {
  return env.MODE !== 'production'
}

export function environmentLabel(env: ImportMetaEnv = import.meta.env): string {
  return env.MODE === 'production' ? 'PRODUCCIÓN' : 'AMBIENTE DE PRUEBAS'
}
