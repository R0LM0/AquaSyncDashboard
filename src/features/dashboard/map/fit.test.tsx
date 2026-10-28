import { render, waitFor } from '@testing-library/react'
import L from 'leaflet'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardApiProvider } from '@/app/DashboardApiProvider'
import { MockDashboardApi } from '@/adapters/mock/MockDashboardApi'
import { MapPanel } from './MapPanel'
import { shouldRefit } from './mapView'
import type { MapPoint } from '@/domain/types'

const base: MapPoint = {
  cuenta: 'CTA-1',
  cliente: 'CLIENTE 1',
  lat: 12.13,
  lng: -86.25,
  tipoCambio: 'FotoNueva',
  usuario: 'jmedina',
  fecha: '2026-10-27T10:00:00Z',
}

// Far enough to stay its own marker at the fitted zoom (no clustering).
const second: MapPoint = { ...base, cuenta: 'CTA-2', lat: 13.9, lng: -84.4 }

function renderMap(points: MapPoint[], fitKey: string, ugestionId?: string) {
  const api = new MockDashboardApi({ today: new Date(2026, 9, 27) })
  // The real app hands a stable callback (openAccount is memoized in the layout).
  const onSelectAccount = vi.fn()

  const tree = (nextPoints: MapPoint[], nextFitKey: string) => (
    <DashboardApiProvider api={api}>
      <MapPanel
        points={nextPoints}
        fitKey={nextFitKey}
        ugestionId={ugestionId}
        onSelectAccount={onSelectAccount}
        height={320}
      />
    </DashboardApiProvider>
  )

  const view = render(tree(points, fitKey))

  return { ...view, rerender: (nextPoints: MapPoint[], nextFitKey: string) => view.rerender(tree(nextPoints, nextFitKey)) }
}

describe('shouldRefit', () => {
  it('re-frames on the first load and when the filter key changes only', () => {
    expect(shouldRefit(null, 'filters-a|points')).toBe(true)
    expect(shouldRefit('filters-a|points', 'filters-a|points')).toBe(false)
    expect(shouldRefit('filters-a|points', 'filters-b|points')).toBe(true)
  })
})

describe('map fitting', () => {
  beforeEach(() => {
    vi.spyOn(L.Map.prototype, 'fitBounds').mockImplementation(function mockFitBounds(this: L.Map) {
      return this
    })
  })

  const markerCalls = () => document.querySelectorAll('.map-pin').length

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fits once on the first load', async () => {
    renderMap([base], 'filters-a')

    await waitFor(() => expect(L.Map.prototype.fitBounds).toHaveBeenCalledTimes(1))
  })

  it('never re-frames the map on a live event', async () => {
    const view = renderMap([base], 'filters-a')
    await waitFor(() => expect(L.Map.prototype.fitBounds).toHaveBeenCalledTimes(1))

    // A live change arrives: the point list grows but the filters did not change.
    view.rerender([base, second], 'filters-a')
    await waitFor(() => expect(document.querySelectorAll('.map-pin').length).toBeGreaterThan(1))

    expect(L.Map.prototype.fitBounds).toHaveBeenCalledTimes(1)
  })

  it('only adds the new marker instead of rebuilding the list or the map', async () => {
    const markerFactory = vi.spyOn(L, 'marker')
    const view = renderMap([base], 'filters-a')
    await waitFor(() => expect(document.querySelectorAll('.map-pin').length).toBe(1))

    const mapNode = document.querySelector('.leaflet-container')
    const markersAfterFirstLoad = markerFactory.mock.calls.length
    expect(markersAfterFirstLoad).toBe(1)

    view.rerender([base, second], 'filters-a')
    await waitFor(() => expect(document.querySelectorAll('.map-pin').length).toBe(2))

    // Exactly one marker layer is created for the live account: the other one is
    // reused, and the map instance itself is never re-created.
    expect(markerFactory.mock.calls.length).toBe(markersAfterFirstLoad + 1)
    expect(document.querySelector('.leaflet-container')).toBe(mapNode)
  })

  it('waits for the boundary polygon and frames it exactly once', async () => {
    const view = renderMap([base], 'filters-a', '1')
    const onSelectAccount = vi.fn()

    // While the polygon loads the map must not frame the points.
    await waitFor(() => expect(markerCalls()).toBe(1))
    expect(L.Map.prototype.fitBounds).toHaveBeenCalledTimes(0)

    await waitFor(() => expect(L.Map.prototype.fitBounds).toHaveBeenCalledTimes(1))

    // A live point does not move the map away from the selected boundary.
    view.rerender([base, second], 'filters-a')
    await waitFor(() => expect(markerCalls()).toBe(2))
    expect(L.Map.prototype.fitBounds).toHaveBeenCalledTimes(1)

    onSelectAccount.mockReset()
  })

  it('re-frames when the filters change', async () => {
    const view = renderMap([base], 'filters-a')
    await waitFor(() => expect(L.Map.prototype.fitBounds).toHaveBeenCalledTimes(1))

    view.rerender([base], 'filters-b')

    await waitFor(() => expect(L.Map.prototype.fitBounds).toHaveBeenCalledTimes(2))
  })
})
