import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MockDashboardApi } from '@/adapters/mock/MockDashboardApi'
import { ForbiddenError, SessionExpiredError } from '@/domain/errors'
import type { Filters } from '@/domain/types'
import { useDashboardData } from './useDashboardData'

const filters: Filters = { desde: '2026-10-01', hasta: '2026-10-27', ugestionId: '1' }

describe('useDashboardData on a 403', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows the no-access message, asks to reset to the scope and never logs out', async () => {
    const api = new MockDashboardApi()
    vi.spyOn(api, 'summary').mockRejectedValue(new ForbiddenError())
    const onSessionExpired = vi.fn()
    const onForbidden = vi.fn()

    const { result } = renderHook(() => useDashboardData(api, filters, 0, onSessionExpired, onForbidden))

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toBe('No tiene acceso a esos datos')
    expect(onForbidden).toHaveBeenCalledTimes(1)
    expect(onSessionExpired).not.toHaveBeenCalled()
  })

  it('still logs out on a 401', async () => {
    const api = new MockDashboardApi()
    vi.spyOn(api, 'summary').mockRejectedValue(new SessionExpiredError())
    const onSessionExpired = vi.fn()
    const onForbidden = vi.fn()

    renderHook(() => useDashboardData(api, filters, 0, onSessionExpired, onForbidden))

    await waitFor(() => expect(onSessionExpired).toHaveBeenCalledTimes(1))
    expect(onForbidden).not.toHaveBeenCalled()
  })
})
