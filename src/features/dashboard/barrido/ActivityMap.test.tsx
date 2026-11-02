import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import L from 'leaflet'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardApiProvider } from '@/app/DashboardApiProvider'
import { MockDashboardApi } from '@/adapters/mock/MockDashboardApi'
import { ActivityMap, layerKey, type ActivityMapPoint } from './ActivityMap'
import { buildPopup } from './activityPopup'

function point(id: string, lat: number, lng: number, extra: Partial<ActivityMapPoint> = {}): ActivityMapPoint {
  return {
    id,
    lat,
    lng,
    color: '#2563eb',
    kind: 'registro',
    surveyId: '203405',
    popup: buildPopup('Cuenta 1500', ['N° catastral 99-1', 'Dispositivo A'], lat, lng, { survey: true }),
    ...extra,
  }
}

function renderMap(points: ActivityMapPoint[], props: Partial<React.ComponentProps<typeof ActivityMap>> = {}) {
  const api = new MockDashboardApi({ today: new Date(2026, 10, 1, 12) })
  return render(
    <DashboardApiProvider api={api}>
      <ActivityMap
        points={points}
        fitKey="k"
        legend={[]}
        focus={null}
        emptyTitle="vacío"
        emptyDetail="vacío"
        ariaLabel="Mapa"
        {...props}
      />
    </DashboardApiProvider>,
  )
}

function captureMaps(): L.Map[] {
  const maps: L.Map[] = []
  const hook = function (this: L.Map) {
    maps.push(this)
  }
  L.Map.addInitHook(hook)
  return maps
}

function markersOf(map: L.Map): L.CircleMarker[] {
  const found: L.CircleMarker[] = []
  map.eachLayer((layer) => {
    if (layer instanceof L.CircleMarker) found.push(layer)
  })
  return found
}

/** The interactive circles Leaflet draws as SVG paths. */
const circles = (container: HTMLElement) => container.querySelectorAll('path.leaflet-interactive')

describe('ActivityMap survey points', () => {
  beforeEach(() => localStorage.clear())

  it('opens the popup with the survey data when a point is clicked and "Ver encuesta" calls back', async () => {
    const onOpenSurvey = vi.fn()
    const { container } = renderMap([point('p-0', 12.13, -86.25)], { onOpenSurvey })

    await waitFor(() => expect(circles(container).length).toBe(1))
    fireEvent.click(circles(container)[0])

    expect(await screen.findByText('Cuenta 1500')).toBeInTheDocument()
    expect(screen.getByText(/N° catastral 99-1/)).toBeInTheDocument()
    expect(screen.getByText(/Dispositivo A/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir en Google Maps' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ubicar en el mapa' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Ver encuesta' }))
    expect(onOpenSurvey).toHaveBeenCalledWith('203405')
  })

  it('opens the popup in canvas mode too (more than 1,500 points)', async () => {
    // jsdom has no canvas: a context whose every method is a no-op is enough for Leaflet to draw.
    const noop = new Proxy({}, { get: () => () => undefined, set: () => true })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(noop as unknown as CanvasRenderingContext2D)
    const maps = captureMaps()
    const many = Array.from({ length: 1501 }, (_, i) => point(`p-${i}`, 12.13 + i * 1e-5, -86.25))
    const onOpenSurvey = vi.fn()
    const { container } = renderMap(many, { onOpenSurvey })

    await waitFor(() => expect(container.querySelector('canvas')).not.toBeNull())
    expect(circles(container).length).toBe(0)

    const marker = markersOf(maps[0])[0]
    marker.fire('click', { latlng: marker.getLatLng() })

    expect(await screen.findByText('Cuenta 1500')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ver encuesta' }))
    expect(onOpenSurvey).toHaveBeenCalledWith('203405')
  })

  it('keeps the points above lots that arrive later, so a lot never swallows the click', async () => {
    const maps = captureMaps()
    const { container } = renderMap([point('p-0', 12.13, -86.25)])
    await waitFor(() => expect(circles(container).length).toBe(1))
    const marker = circles(container)[0]

    // The lots response lands after the markers were drawn.
    L.polygon([[12.1, -86.3], [12.2, -86.3], [12.2, -86.2]]).addTo(maps[0])
    expect(marker.parentNode?.lastChild).not.toBe(marker)

    await waitFor(() => expect(marker.parentNode?.lastChild).toBe(marker))
  })

  it('shows how many pending accounts have no location', () => {
    renderMap([point('p-0', 12.13, -86.25)], {
      pending: { on: true, busy: false, count: 7, withoutLocation: 3, onToggle: () => undefined },
    })
    expect(screen.getByText('3 cuentas pendientes sin ubicación')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cuentas pendientes (7)' })).toBeInTheDocument()
  })

  it('stays quiet when every pending account has a location', () => {
    renderMap([point('p-0', 12.13, -86.25)], {
      pending: { on: true, busy: false, count: 7, withoutLocation: 0, onToggle: () => undefined },
    })
    expect(screen.queryByTestId('pending-no-location')).not.toBeInTheDocument()
  })
})

describe('layerKey', () => {
  it('differs for every response, even when the feature count and zoom repeat', () => {
    const first = { type: 'FeatureCollection', features: new Array(3000) }
    const second = { type: 'FeatureCollection', features: new Array(3000) }
    expect(layerKey(first)).not.toBe(layerKey(second))
    expect(layerKey(first)).toBe(layerKey(first))
  })
})
