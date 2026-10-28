import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NotFoundError } from '@/domain/errors'
import type { AccountDetail } from '@/domain/types'
import type { DashboardApi } from '@/ports/DashboardApi'
import { useAccountDetail } from './useAccountDetail'

function detailOf(cuenta: string): AccountDetail {
  return {
    cuenta,
    cliente: `CLIENTE ${cuenta}`,
    direccion: '',
    tipoServicio: '1',
    estado: 'A',
    estadoAdministrativo: 'A',
    medidor: 'M-1',
    filial: '01',
    zona: '02',
    ruta: '003',
    numeroCatastral: '02.003.5012',
    ugestionId: '4',
    ugestionNombre: 'UG',
    sucursalId: '17',
    sucursalNombre: 'Sucursal',
    lat: 12.1,
    lng: -86.2,
    fotos: [],
    historial: [],
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('useAccountDetail', () => {
  it('loads the requested account', async () => {
    const api = {
      accountDetail: vi.fn().mockResolvedValue(detailOf('5012')),
    } as unknown as DashboardApi

    const { result } = renderHook(() => useAccountDetail(api, '5012'))

    expect(result.current.status).toBe('loading')
    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.status).toBe('ready')
    expect(result.current.detail?.cuenta).toBe('5012')
  })

  it('never lets a stale response replace the current account', async () => {
    const first = deferred<AccountDetail>()
    const second = deferred<AccountDetail>()
    const accountDetail = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    const api = { accountDetail } as unknown as DashboardApi

    const { result, rerender } = renderHook(
      (props: { cuenta: string }) => useAccountDetail(api, props.cuenta),
      { initialProps: { cuenta: '1111' } },
    )
    expect(result.current.status).toBe('loading')

    rerender({ cuenta: '2222' })
    await act(async () => {
      second.resolve(detailOf('2222'))
      await Promise.resolve()
    })
    expect(result.current.detail?.cuenta).toBe('2222')

    // The slow answer for the previous account arrives later and is ignored.
    await act(async () => {
      first.resolve(detailOf('1111'))
      await Promise.resolve()
    })
    expect(result.current.detail?.cuenta).toBe('2222')
    expect(accountDetail).toHaveBeenCalledTimes(2)
  })

  it('maps a 404 to the not found state', async () => {
    const api = {
      accountDetail: vi.fn().mockRejectedValue(new NotFoundError()),
    } as unknown as DashboardApi

    const { result } = renderHook(() => useAccountDetail(api, '9999'))
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.status).toBe('notfound')
  })

  it('goes back to idle when the panel closes', async () => {
    const api = {
      accountDetail: vi.fn().mockResolvedValue(detailOf('5012')),
    } as unknown as DashboardApi

    const { result, rerender } = renderHook(
      (props: { cuenta: string | null }) => useAccountDetail(api, props.cuenta),
      { initialProps: { cuenta: '5012' as string | null } },
    )
    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.status).toBe('ready')

    rerender({ cuenta: null })
    expect(result.current.status).toBe('idle')
  })
})
