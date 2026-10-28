import { useCallback, useEffect, useRef, useState } from 'react'
import { matchesFilters } from '../../domain/live'
import type { Filters, LiveChange } from '../../domain/types'
import type { DashboardApi, LiveStatus } from '../../ports/DashboardApi'

/** Charts and the authoritative numbers refresh at most once per window. */
export const LIVE_REFRESH_MS = 5_000
/** While the channel is down, refresh periodically instead. */
export const OFFLINE_REFRESH_MS = 60_000
const FEED_LIMIT = 30

export interface LiveFeedItem extends LiveChange {
  recibidoEn: string
}

export interface UseLiveChangesOptions {
  api: DashboardApi
  filters: Filters
  onRefresh: () => void
}

export interface LiveChangesState {
  feed: LiveFeedItem[]
  status: LiveStatus
  paused: boolean
  togglePaused: () => void
}

/**
 * The only place that knows about the live channel. Screens get a feed, a
 * counter delta and a status; whether the transport is a mock timer or SignalR
 * is an adapter detail.
 */
export function useLiveChanges({ api, filters, onRefresh }: UseLiveChangesOptions): LiveChangesState {
  const [feed, setFeed] = useState<LiveFeedItem[]>([])
  const [status, setStatus] = useState<LiveStatus>('reconnecting')
  const [paused, setPaused] = useState(false)

  const filtersRef = useRef(filters)
  const pausedRef = useRef(paused)
  const refreshRef = useRef(onRefresh)
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    filtersRef.current = filters
  })

  useEffect(() => {
    pausedRef.current = paused
  })

  useEffect(() => {
    refreshRef.current = onRefresh
  })

  const scheduleRefresh = useCallback(() => {
    // Throttle, not debounce: the first event opens the window and later ones
    // coalesce into it, so the UI never refreshes more than once every 5 s.
    if (refreshTimer.current !== undefined) return
    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = undefined
      refreshRef.current()
    }, LIVE_REFRESH_MS)
  }, [])

  useEffect(
    () => () => {
      if (refreshTimer.current !== undefined) clearTimeout(refreshTimer.current)
      refreshTimer.current = undefined
    },
    [],
  )

  useEffect(() => {
    return api.subscribeChanges((change) => {
      if (pausedRef.current) return
      if (!matchesFilters(change, filtersRef.current)) return

      const item: LiveFeedItem = { ...change, recibidoEn: new Date().toISOString() }
      setFeed((current) => [item, ...current].slice(0, FEED_LIMIT))
      scheduleRefresh()
    }, setStatus)
  }, [api, scheduleRefresh])

  useEffect(() => {
    if (paused || status === 'live') return
    const interval = setInterval(() => refreshRef.current(), OFFLINE_REFRESH_MS)
    return () => clearInterval(interval)
  }, [paused, status])

  // The server never resends a lost event, so a reconnect re-queries the reports.
  const previousStatus = useRef<LiveStatus | null>(null)
  useEffect(() => {
    const previous = previousStatus.current
    previousStatus.current = status
    if (previous && previous !== 'live' && status === 'live' && !pausedRef.current) {
      refreshRef.current()
    }
  }, [status])

  const togglePaused = useCallback(() => setPaused((current) => !current), [])

  return { feed, status, paused, togglePaused }
}
