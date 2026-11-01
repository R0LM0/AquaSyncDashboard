import { useEffect, useRef, useState } from 'react'
import { errorMessage, isSessionExpired } from '@/domain/errors'
import type { DashboardApi } from '@/ports/DashboardApi'

export type ResourceStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface ResourceState<T> {
  status: ResourceStatus
  data?: T
  error?: string
}

interface Settled<T> {
  key: string
  status: 'ready' | 'error'
  data?: T
  error?: string
}

export interface UseActivityResourceOptions<T> {
  /** Identifies the request: null keeps the hook idle. A new key aborts the one in flight. */
  key: string | null
  load: (signal: AbortSignal) => Promise<T>
  fallbackError: string
  onSessionExpired?: () => void
  /** Changes when the data must be fetched again; the data on screen stays until the new one lands. */
  refreshToken?: number
}

/**
 * Loads one report of the activity pages. A result for another key is never shown (the view
 * is loading until its key settles); a refresh of the same key keeps the old data on screen.
 * A 401 closes the session through the caller.
 */
export function useActivityResource<T>({
  key,
  load,
  fallbackError,
  onSessionExpired,
  refreshToken = 0,
}: UseActivityResourceOptions<T>): ResourceState<T> {
  const [settled, setSettled] = useState<Settled<T> | null>(null)
  const loadRef = useRef(load)
  const expiredRef = useRef(onSessionExpired)

  useEffect(() => {
    loadRef.current = load
    expiredRef.current = onSessionExpired
  })

  useEffect(() => {
    if (key === null) return

    const controller = new AbortController()

    loadRef.current(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setSettled({ key, status: 'ready', data })
      },
      (error: unknown) => {
        if (controller.signal.aborted) return
        if (isSessionExpired(error)) {
          expiredRef.current?.()
          return
        }
        setSettled({ key, status: 'error', error: errorMessage(error, fallbackError) })
      },
    )

    return () => controller.abort()
  }, [key, refreshToken, fallbackError])

  if (key === null) return { status: 'idle' }
  if (!settled || settled.key !== key) return { status: 'loading' }
  return { status: settled.status, data: settled.data, error: settled.error }
}

/** Refetches are grouped: a burst of phones registering at once triggers one reload. */
export const ACTIVITY_REFRESH_MS = 2_000

/**
 * Subscribes to the live notices of one module and returns a token that changes (at most once
 * per window) when a phone registered activity there. Feed the token to `useActivityResource`.
 */
export function useActivityRefresh(api: DashboardApi, modulo: 'barrido' | 'servicio_nuevo'): number {
  const [token, setToken] = useState(0)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined

    const off = api.subscribeActivity((event) => {
      if (event.modulo !== modulo || timer !== undefined) return
      timer = setTimeout(() => {
        timer = undefined
        setToken((current) => current + 1)
      }, ACTIVITY_REFRESH_MS)
    })

    return () => {
      off()
      if (timer !== undefined) clearTimeout(timer)
    }
  }, [api, modulo])

  return token
}
