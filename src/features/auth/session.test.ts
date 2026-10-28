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
})
