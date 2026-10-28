import { describe, expect, it } from 'vitest'
import { ALCANCE_PAIS } from '@/domain/alcance'
import { readSession, saveSession } from './session'

function memoryStorage(): Storage {
  const data = new Map<string, string>()
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  } as unknown as Storage
}

describe('session', () => {
  it('keeps the Alcance of the user with the session', () => {
    const store = memoryStorage()
    saveSession({ token: 't', usuario: 'admin', nombre: 'Admin', alcance: ALCANCE_PAIS }, 'pruebas', store)

    expect(readSession('pruebas', store)?.alcance).toEqual(ALCANCE_PAIS)
  })

  it('treats a session saved before the Alcance existed as logged out', () => {
    const store = memoryStorage()
    store.setItem(
      'aquasync.dashboard.session.pruebas',
      JSON.stringify({ token: 't', usuario: 'admin', nombre: 'Admin' }),
    )

    expect(readSession('pruebas', store)).toBeNull()
  })

  it('treats a session whose JWT exp is already past as logged out', () => {
    const store = memoryStorage()
    const expired = jwtWithExp(Math.floor(Date.now() / 1000) - 60)
    saveSession({ token: expired, usuario: 'admin', nombre: 'Admin', alcance: ALCANCE_PAIS }, 'pruebas', store)

    expect(readSession('pruebas', store)).toBeNull()
  })

  it('keeps a session whose JWT exp is still in the future', () => {
    const store = memoryStorage()
    const valid = jwtWithExp(Math.floor(Date.now() / 1000) + 3600)
    saveSession({ token: valid, usuario: 'admin', nombre: 'Admin', alcance: ALCANCE_PAIS }, 'pruebas', store)

    expect(readSession('pruebas', store)?.usuario).toBe('admin')
  })

  it('keeps a session whose token is not a JWT (the exp is unknown)', () => {
    const store = memoryStorage()
    saveSession({ token: 'opaque-token', usuario: 'admin', nombre: 'Admin', alcance: ALCANCE_PAIS }, 'pruebas', store)

    expect(readSession('pruebas', store)?.usuario).toBe('admin')
  })
})

/** A JWT-shaped token whose payload carries the given exp (seconds). */
function jwtWithExp(exp: number): string {
  const encode = (value: unknown) =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ exp })}.signature`
}
