import type { Session } from '../../domain/types'
import {
  resolveRuntimeEnvironment,
  type RuntimeEnvironment,
} from '../../app/runtimeEnvironment'

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
      'nombre' in parsed
    ) {
      const session = parsed as Session
      if (session.token && session.usuario) return session
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
