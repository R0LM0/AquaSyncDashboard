import type { Session } from '../../domain/types'

const SESSION_KEY = 'aquasync.dashboard.session'

/** Session lives in sessionStorage: it dies with the browser tab. */
export function readSession(storage: Storage = sessionStorage): Session | null {
  const raw = storage.getItem(SESSION_KEY)
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

export function saveSession(session: Session, storage: Storage = sessionStorage): void {
  storage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession(storage: Storage = sessionStorage): void {
  storage.removeItem(SESSION_KEY)
}

export { SESSION_KEY }
