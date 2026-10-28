import { resolveApiUrl, type ApiUrlEnv, type LocationLike } from './apiUrl'
import {
  defaultRuntimeEnvironment,
  isEnvironmentSwitchable,
  ENVIRONMENT_LABELS,
  type RuntimeEnvironment,
} from './runtimeEnvironment'

export type EnvironmentTone = 'success' | 'warning' | 'info' | 'violet'

export interface EnvironmentInfo {
  label: string
  tone: EnvironmentTone
  /** host:port the dashboard talks to, shown in the tooltip. */
  detail: string
  simulated: boolean
}

export interface EnvironmentSource {
  MODE: string
  VITE_API_MODE?: string
}

function authorityOf(apiUrl: string): string {
  try {
    const url = new URL(apiUrl)
    return url.port ? `${url.hostname}:${url.port}` : url.hostname
  } catch {
    return apiUrl
  }
}

/**
 * One visible answer to "which server am I looking at?".
 * Simulated data always wins the label, whatever the build mode says.
 */
export function describeEnvironment(
  env: EnvironmentSource,
  apiUrl: string,
  environment?: RuntimeEnvironment,
): EnvironmentInfo {
  const detail = authorityOf(apiUrl)

  // The dev build is never shown as production, whatever adapter it uses.
  if (env.VITE_API_MODE === 'mock' || env.MODE === 'development') {
    return { label: 'DATOS DE PRUEBA', tone: 'violet', detail: `Datos simulados · ${detail}`, simulated: true }
  }

  if (env.MODE === 'localapi') {
    return { label: 'LOCAL', tone: 'info', detail, simulated: false }
  }

  // A switchable build follows the login choice; a fixed build follows its mode.
  const effective =
    environment ??
    (isEnvironmentSwitchable({ MODE: env.MODE, VITE_API_MODE: env.VITE_API_MODE })
      ? 'produccion'
      : defaultRuntimeEnvironment({ MODE: env.MODE, VITE_API_MODE: env.VITE_API_MODE }))

  if (effective === 'pruebas') {
    return { label: ENVIRONMENT_LABELS.pruebas, tone: 'warning', detail, simulated: false }
  }

  return { label: ENVIRONMENT_LABELS.produccion, tone: 'success', detail, simulated: false }
}

/** What the running app sees, with the browser location when available. */
export function currentEnvironment(
  env: EnvironmentSource & Partial<ApiUrlEnv> = import.meta.env,
  location?: LocationLike,
  environment?: RuntimeEnvironment,
): EnvironmentInfo {
  const currentLocation =
    location ?? (typeof window === 'undefined' ? { protocol: 'http:', hostname: 'localhost' } : window.location)
  const effective =
    environment ??
    (isEnvironmentSwitchable({ MODE: env.MODE, VITE_API_MODE: env.VITE_API_MODE })
      ? 'produccion'
      : defaultRuntimeEnvironment({ MODE: env.MODE, VITE_API_MODE: env.VITE_API_MODE }))

  return describeEnvironment(
    env,
    resolveApiUrl(currentLocation, env as ApiUrlEnv, effective),
    effective,
  )
}
