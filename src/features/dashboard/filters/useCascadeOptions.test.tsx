import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MockDashboardApi } from '@/adapters/mock/MockDashboardApi'
import type { Filters } from '@/domain/types'
import { useCascadeOptions } from './useCascadeOptions'

const base: Filters = { desde: '2026-10-01', hasta: '2026-10-27' }

function setup(initial: Filters) {
  const api = new MockDashboardApi({ today: new Date(2026, 9, 27) })
  const spy = vi.spyOn(api, 'cascade')
  const hook = renderHook(({ filters }: { filters: Filters }) => useCascadeOptions(api, filters), {
    initialProps: { filters: initial },
  })
  return { spy, ...hook }
}

describe('useCascadeOptions', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads the departamentos at once and nothing below an unchosen level', async () => {
    const { spy, result } = setup(base)

    await waitFor(() => expect(result.current.departamento.length).toBeGreaterThan(0))

    expect(spy).toHaveBeenCalledWith('departamento', {})
    expect(spy).not.toHaveBeenCalledWith('ugestion', expect.anything())
    expect(result.current.ugestion).toEqual([])
  })

  it('loads the ciudades when a unidad de gestión is chosen', async () => {
    const { spy, result, rerender } = setup({ ...base, departamentoId: '1' })
    await waitFor(() => expect(result.current.ugestion.length).toBeGreaterThan(0))

    rerender({ filters: { ...base, departamentoId: '1', ugestionId: '1' } })

    await waitFor(() => expect(result.current.ciudad.length).toBeGreaterThan(0))
    expect(spy).toHaveBeenCalledWith('ciudad', { ugestionId: '1' })
  })

  it('loads the filiales when a sucursal is chosen, with the whole chain as parents', async () => {
    const chain: Filters = { ...base, departamentoId: '1', ugestionId: '1', ciudadId: '11' }
    const { spy, result, rerender } = setup(chain)
    await waitFor(() => expect(result.current.sucursal.length).toBeGreaterThan(0))

    rerender({ filters: { ...chain, sucursalId: result.current.sucursal[0].id } })

    await waitFor(() => expect(result.current.filial.length).toBeGreaterThan(0))
    expect(spy).toHaveBeenCalledWith(
      'filial',
      expect.objectContaining({ dptoId: '1', ugestionId: '1', ciudadId: '11' }),
    )
  })
})
