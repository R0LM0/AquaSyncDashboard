/** Only the browser location fields the resolver needs. */
export interface LocationLike {
  protocol: string
  hostname: string
}

export interface ApiUrlEnv {
  VITE_API_URL?: string
  VITE_API_PORT?: string
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
 * - Otherwise `${protocol}//${hostname}:${VITE_API_PORT}/`.
 */
export function resolveApiUrl(location: LocationLike, env: ApiUrlEnv): string {
  const override = env.VITE_API_URL?.trim()
  if (override) return withTrailingSlash(override)

  const port = env.VITE_API_PORT?.trim()
  const authority = port ? `${location.hostname}:${port}` : location.hostname

  return `${location.protocol}//${authority}/`
}

/** Hub URL built from the same base, so there is no second source of truth. */
export function dashboardHubUrl(apiUrl: string): string {
  return `${apiUrl}hubs/dashboard`
}
