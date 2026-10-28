import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyLiveDelta, liveDeltaSince, livePointsSince } from '../../../domain/live'
import type { Filters, LiveChange, Summary } from '../../../domain/types'
import type { DashboardApi } from '../../../ports/DashboardApi'
import { KpiCards } from '../kpis/KpiCards'
import { LiveFeed } from './LiveFeed'
import { ChangesMap } from '../map/ChangesMap'
import { LIVE_REFRESH_MS, useLiveChanges } from '../useLiveChanges'

const filters: Filters = { desde: '2026-10-01', hasta: '2026-10-31', ruta: 'Ruta MGA-01' }

const baseSummary: Summary = {
  cuentasTrabajadas: 10,
  fotosNuevas: 0,
  fotosActualizadas: 0,
  ubicaciones: 0,
  usuariosActivos: 4,
  avanceRutaPct: 50,
}

function liveChange(overrides: Partial<LiveChange> = {}): LiveChange {
  return {
    id: 'CAMB-LIVE-1',
    fecha: new Date().toISOString(),
    usuario: 'jmedina',
    cuenta: 'CTA-110001',
    cliente: 'Comercial La Colonia',
    filial: 'Filial Managua',
    zona: 'Zona Managua Centro',
    ruta: 'Ruta MGA-01',
    tipoCambio: 'FotoNueva',
    origen: 'AquaSync',
    lat: 12.13,
    lng: -86.25,
    ...overrides,
  }
}

function createFakeApi() {
  let emit: ((change: LiveChange) => void) | undefined
  const api = {
    subscribeChanges: (onChange: (change: LiveChange) => void) => {
      emit = onChange
      return () => {
        emit = undefined
      }
    },
    login: vi.fn(),
    catalogs: vi.fn(),
    summary: vi.fn(),
    dailyProgress: vi.fn(),
    userRouteProgress: vi.fn(),
    mapPoints: vi.fn(),
    changes: vi.fn(),
  } as unknown as DashboardApi

  return {
    api,
    push(change: LiveChange) {
      if (!emit) throw new Error('El componente no está suscripto al canal en vivo')
      emit(change)
    },
  }
}

// Mirrors how DashboardPage composes the hook: the snapshot already counted
// these accounts and users before the live window opened.
const known = {
  cuentas: new Set(['CTA-000001']),
  usuarios: new Set(['otro-usuario']),
}

function Harness({ api, onRefresh }: { api: DashboardApi; onRefresh: () => void }) {
  const live = useLiveChanges({ api, filters, onRefresh })
  const delta = liveDeltaSince(live.feed, 0, known)

  return (
    <div>
      <KpiCards summary={applyLiveDelta(baseSummary, delta)} />
      <LiveFeed
        items={live.feed}
        status={live.status}
        paused={live.paused}
        onTogglePaused={live.togglePaused}
      />
      <ChangesMap points={livePointsSince(live.feed, 0)} highlight={null} />
    </div>
  )
}

// Hook only: leaflet adds its own animation timers, so the timer-leak assertion
// must not include the map.
function HookHarness({ api, onRefresh }: { api: DashboardApi; onRefresh: () => void }) {
  const live = useLiveChanges({ api, filters, onRefresh })
  return <span data-testid="feed-length">{live.feed.length}</span>
}

describe('useLiveChanges', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Counters render statically, so the assertions do not race the animation.
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    )
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('updates the KPIs and the feed when a change matches the filters', () => {
    const fake = createFakeApi()
    render(<Harness api={fake.api} onRefresh={() => {}} />)

    expect(screen.getByTestId('kpi-fotosNuevas')).toHaveTextContent('0')

    act(() => fake.push(liveChange()))

    expect(screen.getByTestId('kpi-fotosNuevas')).toHaveTextContent('1')
    expect(screen.getByTestId('live-feed')).toHaveTextContent('CTA-110001')
    expect(screen.getByTestId('live-feed')).toHaveTextContent('jmedina')
  })

  it('counts a new account and user once, and puts the point on the map', () => {
    const fake = createFakeApi()
    render(<Harness api={fake.api} onRefresh={() => {}} />)

    expect(screen.getByTestId('kpi-cuentasTrabajadas')).toHaveTextContent('10')
    expect(screen.getByTestId('changes-map')).toHaveAttribute('data-points', '0')

    act(() => fake.push(liveChange({ id: 'p1' })))
    act(() => fake.push(liveChange({ id: 'p2', tipoCambio: 'UbicacionNueva' })))

    expect(screen.getByTestId('kpi-cuentasTrabajadas')).toHaveTextContent('11')
    expect(screen.getByTestId('kpi-usuariosActivos')).toHaveTextContent('5')
    expect(screen.getByTestId('kpi-fotosNuevas')).toHaveTextContent('1')
    expect(screen.getByTestId('kpi-ubicaciones')).toHaveTextContent('1')
    // The live point reaches the map before the next authoritative refresh.
    expect(screen.getByTestId('changes-map')).toHaveAttribute('data-points', '1')
  })

  it('refreshes the authoritative data at most once per window', () => {
    const fake = createFakeApi()
    const onRefresh = vi.fn()
    render(<Harness api={fake.api} onRefresh={onRefresh} />)

    act(() => {
      fake.push(liveChange({ id: 'a' }))
      fake.push(liveChange({ id: 'b' }))
      fake.push(liveChange({ id: 'c' }))
    })
    expect(onRefresh).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(LIVE_REFRESH_MS))
    expect(onRefresh).toHaveBeenCalledTimes(1)

    act(() => fake.push(liveChange({ id: 'd' })))
    act(() => vi.advanceTimersByTime(LIVE_REFRESH_MS))
    expect(onRefresh).toHaveBeenCalledTimes(2)
  })

  it('ignores a change that does not match the filters', () => {
    const fake = createFakeApi()
    render(<Harness api={fake.api} onRefresh={() => {}} />)

    act(() => fake.push(liveChange({ ruta: 'Ruta LEÓN-01', usuario: 'asilva', id: 'other-route' })))

    expect(screen.getByTestId('kpi-fotosNuevas')).toHaveTextContent('0')
    expect(screen.getByTestId('live-feed')).toHaveTextContent('Esperando actividad')
  })

  it('pausing stops the updates and resuming brings them back', () => {
    const fake = createFakeApi()
    const onRefresh = vi.fn()
    render(<Harness api={fake.api} onRefresh={onRefresh} />)

    act(() => screen.getByRole('button', { name: /pausar/i }).click())
    expect(screen.getByTestId('live-status')).toHaveTextContent('En pausa')

    act(() => fake.push(liveChange()))
    act(() => vi.advanceTimersByTime(LIVE_REFRESH_MS))

    expect(screen.getByTestId('kpi-fotosNuevas')).toHaveTextContent('0')
    expect(onRefresh).not.toHaveBeenCalled()

    act(() => screen.getByRole('button', { name: /reanudar/i }).click())
    act(() => fake.push(liveChange({ id: 'x2' })))
    expect(screen.getByTestId('kpi-fotosNuevas')).toHaveTextContent('1')
  })

  it('unsubscribing on unmount leaves no timer behind', () => {
    const fake = createFakeApi()
    const onRefresh = vi.fn()
    const view = render(<HookHarness api={fake.api} onRefresh={onRefresh} />)

    act(() => fake.push(liveChange()))
    view.unmount()

    expect(vi.getTimerCount()).toBe(0)
    act(() => vi.advanceTimersByTime(10 * 60_000))
    expect(onRefresh).not.toHaveBeenCalled()
    expect(() => fake.push(liveChange({ id: 'after' }))).toThrow()
  })
})
