import { useEffect, useState } from 'react'
import { isNotFound, isSessionExpired } from '@/domain/errors'
import type { AccountDetail } from '@/domain/types'
import type { DashboardApi } from '@/ports/DashboardApi'

export type AccountDetailStatus = 'idle' | 'loading' | 'ready' | 'notfound' | 'error'

export interface AccountDetailState {
  status: AccountDetailStatus
  detail?: AccountDetail
  error?: string
}

/**
 * Loads the account of the open panel. Switching accounts aborts the previous
 * request, so a slow answer can never overwrite the current account.
 */
export function useAccountDetail(
  api: DashboardApi,
  cuenta: string | null,
  onSessionExpired?: () => void,
): AccountDetailState {
  const [state, setState] = useState<AccountDetailState & { requested: string | null }>({
    status: 'idle',
    requested: null,
  })

  useEffect(() => {
    if (!cuenta) return

    const controller = new AbortController()

    api
      .accountDetail(cuenta, controller.signal)
      .then((detail) => {
        if (controller.signal.aborted) return
        setState({ status: 'ready', requested: cuenta, detail })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        if (isNotFound(error)) {
          setState({ status: 'notfound', requested: cuenta })
          return
        }
        if (isSessionExpired(error)) {
          onSessionExpired?.()
          return
        }
        setState({
          status: 'error',
          requested: cuenta,
          error: error instanceof Error ? error.message : 'No se pudo cargar la cuenta',
        })
      })

    return () => controller.abort()
  }, [api, cuenta, onSessionExpired])

  // The status is derived: a new account is loading until its own answer lands.
  if (!cuenta) return { status: 'idle' }
  if (state.requested !== cuenta) return { status: 'loading' }

  return { status: state.status, detail: state.detail, error: state.error }
}
