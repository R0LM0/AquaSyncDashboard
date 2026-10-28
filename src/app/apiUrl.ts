import {
  ENVIRONMENT_PORTS,
  isEnvironmentSwitchable,
  type RuntimeEnvironment,
} from './runtimeEnvironment'

/** Only the browser location fields the resolver needs. */
export interface LocationLike {
  protocol: string
  hostname: string
}

export interface ApiUrlEnv {
  VITE_API_URL?: string
  VITE_API_PORT?: string
  VITE_API_MODE?: string
  MODE?: string
}

function withTrailingSlash(url: string): string {
  return url.endsWith('/') ? url : `${url}/`
}

/**
 * Single source of truth for the API base URL, used by both the HTTP adapter and
 * the SignalR hub.
 *
 * The dashboard is served from the same server as the API, so the browser host is
 * the API host: one build works from the internal network and from the internet.
 *
 * - `VITE_API_URL` (local mode and explicit overrides) wins as-is.
 * - A production build picks the port of the environment chosen on the login.
 * - Otherwise `${protocol}//${hostname}:${VITE_API_PORT}/`.
 */
export function resolveApiUrl(
  location: LocationLike,
  env: ApiUrlEnv,
  environment: RuntimeEnvironment = 'produccion',
): string {
  const override = env.VITE_API_URL?.trim()
  if (override) return withTrailingSlash(override)

  const switchable = isEnvironmentSwitchable({
    MODE: env.MODE ?? '',
    VITE_API_MODE: env.VITE_API_MODE,
    VITE_API_URL: env.VITE_API_URL,
  })
  const port = switchable ? ENVIRONMENT_PORTS[environment] : env.VITE_API_PORT?.trim()
  const authority = port ? `${location.hostname}:${port}` : location.hostname

  return `${location.protocol}//${authority}/`
}

/** The base URL of the running app, for relative media paths (`UrlImagen`). */
export function currentApiUrl(
  env: ApiUrlEnv = import.meta.env,
  location: LocationLike = window.location,
  environment?: RuntimeEnvironment,
): string {
  return resolveApiUrl(location, env, environment)
}

/** Hub URL built from the same base, so there is no second source of truth. */
export function dashboardHubUrl(apiUrl: string): string {
  return `${apiUrl}hubs/dashboard`
}
