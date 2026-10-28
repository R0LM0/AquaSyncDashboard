import type { Alcance, Session } from '../../domain/types'
import {
  resolveRuntimeEnvironment,
  type RuntimeEnvironment,
} from '../../app/runtimeEnvironment'

function isAlcance(value: unknown): value is Alcance {
  if (!value || typeof value !== 'object') return false
  const alcance = value as Partial<Alcance>
  return typeof alcance.pais === 'boolean' && Array.isArray(alcance.sucursales) && Boolean(alcance.mapa)
}

/** One session per environment: switching never reuses the other token. */
export function sessionKey(environment: RuntimeEnvironment): string {
  return `aquasync.dashboard.session.${environment}`
}

/** The environment the running build uses right now. */
export function currentEnvironment_(): RuntimeEnvironment {
  return resolveRuntimeEnvironment(import.meta.env)
}

/** Session lives in sessionStorage: it dies with the browser tab. */
export function readSession(
  environment: RuntimeEnvironment = currentEnvironment_(),
  storage: Storage = sessionStorage,
): Session | null {
  const raw = storage.getItem(sessionKey(environment))
  if (!raw) return null

  try {
    const parsed: unknown = JSON.parse(raw)
    if (
      parsed &&
      typeof parsed === 'object' &&
      'token' in parsed &&
      'usuario' in parsed &&
      'nombre' in parsed &&
      'alcance' in parsed
    ) {
      // A session saved before the Alcance existed is treated as logged out.
      const session = parsed as Session
      if (session.token && session.usuario && isAlcance(session.alcance)) return session
    }
    return null
  } catch {
    return null
  }
}

export function saveSession(
  session: Session,
  environment: RuntimeEnvironment = currentEnvironment_(),
  storage: Storage = sessionStorage,
): void {
  storage.setItem(sessionKey(environment), JSON.stringify(session))
}

export function clearSession(
  environment: RuntimeEnvironment = currentEnvironment_(),
  storage: Storage = sessionStorage,
): void {
  storage.removeItem(sessionKey(environment))
}

export { sessionKey as SESSION_KEY_PREFIX }
