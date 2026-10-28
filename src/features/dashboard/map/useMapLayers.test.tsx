import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  MapLayer,
  PredioLayerProperties,
  PrediosQuery,
  SucursalLayerProperties,
  UgestionLayerProperties,
} from '@/domain/types'
import type { DashboardApi } from '@/ports/DashboardApi'
import { PREDIOS_DEBOUNCE_MS, useMapLayers } from './useMapLayers'

const EMPTY_LAYER: MapLayer<PredioLayerProperties> = {
  collection: { type: 'FeatureCollection', features: [] },
  truncated: false,
}

const EMPTY_ADMIN_LAYER = {
  collection: { type: 'FeatureCollection' as const, features: [] },
  truncated: false,
}

const BBOX = { minLng: -86.3, minLat: 12.1, maxLng: -86.2, maxLat: 12.2 }
const OTHER_BBOX = { minLng: -86.4, minLat: 12.1, maxLng: -86.3, maxLat: 12.2 }

function createFakeApi(prediosLayer: MapLayer<PredioLayerProperties> = EMPTY_LAYER) {
  const layerPredios = vi.fn(
    async (_query: PrediosQuery, _signal?: AbortSignal) => prediosLayer,
  )
  const layerUgestiones = vi.fn(
    async (_ugestionId?: string, _signal?: AbortSignal) =>
      EMPTY_ADMIN_LAYER as MapLayer<UgestionLayerProperties>,
  )
  const layerSucursales = vi.fn(
    async (_ugestionId?: string, _signal?: AbortSignal) =>
      EMPTY_ADMIN_LAYER as MapLayer<SucursalLayerProperties>,
  )

  const api = {
    layerPredios,
    layerUgestiones,
    layerSucursales,
  } as unknown as DashboardApi

  return { api, layerPredios, layerUgestiones, layerSucursales }
}

const flush = async () => {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('useMapLayers', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not ask for lots below zoom 15 and explains why', async () => {
    const fake = createFakeApi()

    const { result } = renderHook(() =>
      useMapLayers({
        api: fake.api,
        view: { bbox: BBOX, zoom: 12 },
        prediosEnabled: true,
      }),
    )

    await act(async () => {
      vi.advanceTimersByTime(2_000)
    })
    await flush()

    expect(fake.layerPredios).not.toHaveBeenCalled()
    expect(result.current.zoomHint).toMatch(/Acerque el mapa/)
    expect(result.current.predios).toBeUndefined()
  })

  it('loads the lots after the debounce at zoom 16', async () => {
    const fake = createFakeApi({ ...EMPTY_LAYER, truncated: true })

    const { result } = renderHook(() =>
      useMapLayers({ api: fake.api, view: { bbox: BBOX, zoom: 16 }, prediosEnabled: true }),
    )

    expect(fake.layerPredios).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(PREDIOS_DEBOUNCE_MS)
    })
    await flush()

    expect(fake.layerPredios).toHaveBeenCalledTimes(1)
    expect(fake.layerPredios.mock.calls[0][0]).toMatchObject({
      bbox: { minLng: -86.3, minLat: 12.1, maxLng: -86.2, maxLat: 12.2 },
      zoom: 16,
    })
    expect(result.current.truncated).toBe(true)
    expect(result.current.zoomHint).toBeNull()
  })

  it('coalesces fast pans into one request', async () => {
    const fake = createFakeApi()

    const { rerender } = renderHook(
      (props: { bbox: typeof BBOX }) =>
        useMapLayers({ api: fake.api, view: { bbox: props.bbox, zoom: 16 }, prediosEnabled: true }),
      { initialProps: { bbox: BBOX } },
    )

    await act(async () => {
      vi.advanceTimersByTime(100)
    })
    rerender({ bbox: OTHER_BBOX })
    await act(async () => {
      vi.advanceTimersByTime(PREDIOS_DEBOUNCE_MS)
    })
    await flush()

    expect(fake.layerPredios).toHaveBeenCalledTimes(1)
    expect(fake.layerPredios.mock.calls[0][0]).toMatchObject({ bbox: OTHER_BBOX })
  })

  it('aborts the previous lot request when the map moves again', async () => {
    const fake = createFakeApi()

    const { rerender } = renderHook(
      (props: { bbox: typeof BBOX }) =>
        useMapLayers({ api: fake.api, view: { bbox: props.bbox, zoom: 16 }, prediosEnabled: true }),
      { initialProps: { bbox: BBOX } },
    )

    await act(async () => {
      vi.advanceTimersByTime(PREDIOS_DEBOUNCE_MS)
    })
    await flush()

    const firstSignal = fake.layerPredios.mock.calls[0][1] as AbortSignal
    expect(firstSignal.aborted).toBe(false)

    rerender({ bbox: OTHER_BBOX })
    await act(async () => {
      vi.advanceTimersByTime(PREDIOS_DEBOUNCE_MS)
    })
    await flush()

    expect(fake.layerPredios).toHaveBeenCalledTimes(2)
    expect(firstSignal.aborted).toBe(true)
  })

  it('never asks for lots when the layer is off', async () => {
    const fake = createFakeApi()

    renderHook(() =>
      useMapLayers({ api: fake.api, view: { bbox: BBOX, zoom: 17 }, prediosEnabled: false }),
    )

    await act(async () => {
      vi.advanceTimersByTime(2_000)
    })
    await flush()

    expect(fake.layerPredios).not.toHaveBeenCalled()
  })

  it('loads the administrative layers once per gestión filter', async () => {
    const fake = createFakeApi()

    const { rerender } = renderHook(
      (props: { ugestionId?: string }) =>
        useMapLayers({
          api: fake.api,
          ugestionId: props.ugestionId,
          view: { bbox: BBOX, zoom: 9 },
          prediosEnabled: true,
        }),
      { initialProps: {} as { ugestionId?: string } },
    )
    await flush()
    expect(fake.layerUgestiones).toHaveBeenCalledTimes(1)

    rerender({ ugestionId: '4' })
    await flush()
    expect(fake.layerUgestiones).toHaveBeenCalledTimes(2)
    expect(fake.layerUgestiones.mock.calls[1][0]).toBe('4')
  })
})
