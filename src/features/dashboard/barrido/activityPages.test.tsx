import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ALCANCE_PAIS } from '@/domain/alcance'
import App from '@/App'
import { DashboardApiProvider } from '@/app/DashboardApiProvider'
import { MockDashboardApi } from '@/adapters/mock/MockDashboardApi'
import { saveSession } from '@/features/auth/session'
import { buildPopup } from './activityPopup'
import { ACTIVITY_REFRESH_MS } from './useActivityResource'

function renderAt(path: string, api = new MockDashboardApi({ today: new Date(2026, 10, 1, 12) })) {
  saveSession({ token: 't', usuario: 'jmedina', nombre: 'José Medina', alcance: ALCANCE_PAIS })
  window.history.replaceState(null, '', path)
  render(
    <DashboardApiProvider api={api}>
      <App />
    </DashboardApiProvider>,
  )
  return api
}

const SLOW = { timeout: 5000 }

describe('Barrido page', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('shows the assignments, the KPIs and the devices', async () => {
    renderAt('/barrido')

    expect(await screen.findByText('Asignaciones de barrido', {}, SLOW)).toBeInTheDocument()
    const table = await screen.findByRole('table', { name: 'Asignaciones de barrido con su avance' }, SLOW)
    expect(within(table).getAllByRole('row').length).toBeGreaterThan(1)
    for (const header of ['Asignadas', 'Encuestadas', 'Pendientes', 'Avance']) {
      expect(within(table).getByRole('columnheader', { name: header })).toBeInTheDocument()
    }

    expect(await screen.findByText('Encuestas', { selector: 'dt' }, SLOW)).toBeInTheDocument()
    expect(screen.getByText('Hoy', { selector: 'dt' })).toBeInTheDocument()
    expect(screen.getByText('Dispositivos', { selector: 'dt' })).toBeInTheDocument()

    const devices = await screen.findByRole('table', { name: 'Dispositivos con actividad' }, SLOW)
    for (const header of ['Usuario', 'Alias', 'Modelo', 'Versión', 'Encuestas', 'Primera', 'Última']) {
      expect(within(devices).getByRole('columnheader', { name: header })).toBeInTheDocument()
    }
    expect(within(devices).getAllByText(/^Dispositivo [A-D]$/).length).toBeGreaterThan(0)
  })

  it('narrows to one assignment from the keyboard and offers the pending layer', async () => {
    const api = renderAt('/barrido')
    const spy = vi.spyOn(api, 'barridoActividad')
    const table = await screen.findByRole('table', { name: 'Asignaciones de barrido con su avance' }, SLOW)
    await screen.findByRole('table', { name: 'Dispositivos con actividad' }, SLOW)

    expect(screen.queryByRole('button', { name: /cuentas pendientes/i })).not.toBeInTheDocument()

    const row = within(table).getAllByRole('row')[1]
    row.focus()
    fireEvent.keyDown(row, { key: 'Enter' })

    await waitFor(() => expect(spy).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ cliBarridoId: expect.any(String) }), expect.anything()))
    expect(await screen.findByRole('button', { name: 'Ver todas las asignaciones' })).toBeInTheDocument()
    expect(window.location.search).toBe('')

    const toggle = await screen.findByRole('button', { name: /Mostrar cuentas pendientes/ })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(toggle)
    expect(await screen.findByRole('button', { name: /Cuentas pendientes \(\d+\)/ }, SLOW)).toHaveAttribute('aria-pressed', 'true')
  })

  it('lists the worked accounts, searchable, with Ubicar', async () => {
    renderAt('/barrido')
    const worked = await screen.findByRole('table', { name: 'Cuentas trabajadas' }, SLOW)
    for (const header of ['Cuenta', 'N° catastral', 'Dispositivo', 'Fecha']) {
      expect(within(worked).getByRole('columnheader', { name: header })).toBeInTheDocument()
    }
    expect(within(worked).getAllByRole('row').length).toBeGreaterThan(1)
    expect(within(worked).getAllByRole('button', { name: /^Ubicar la cuenta/ }).length).toBeGreaterThan(0)

    fireEvent.change(screen.getByLabelText(/Buscar cuenta trabajada/), { target: { value: 'zzz-no-existe' } })
    expect(await screen.findByText('Ninguna cuenta coincide con la búsqueda')).toBeInTheDocument()
  })

  it('says so when no account was worked', async () => {
    const api = new MockDashboardApi({ today: new Date(2026, 10, 1, 12) })
    vi.spyOn(api, 'barridoActividad').mockResolvedValue({
      resumen: { encuestas: 0, hoy: 0, dispositivos: 0 }, porDia: [], dispositivos: [], puntos: [],
    })
    renderAt('/barrido', api)
    expect(await screen.findByText('Todavía no hay cuentas trabajadas en el período', {}, SLOW)).toBeInTheDocument()
  })

  it('says so when there are no assignments', async () => {
    const api = new MockDashboardApi({ today: new Date(2026, 10, 1, 12) })
    vi.spyOn(api, 'barridoAsignaciones').mockResolvedValue([])
    renderAt('/barrido', api)

    expect(await screen.findByText('No hay asignaciones de barrido', {}, SLOW)).toBeInTheDocument()
  })

  it('shows a clear error when the assignments fail', async () => {
    const api = new MockDashboardApi({ today: new Date(2026, 10, 1, 12) })
    vi.spyOn(api, 'barridoAsignaciones').mockRejectedValue(new Error('Servicio no disponible'))
    renderAt('/barrido', api)

    expect(await screen.findByRole('alert', {}, SLOW)).toHaveTextContent('Servicio no disponible')
  })

  it('refetches when a phone registers activity', async () => {
    const api = renderAt('/barrido')
    const spy = vi.spyOn(api, 'barridoAsignaciones')
    await screen.findByRole('table', { name: 'Dispositivos con actividad' }, SLOW)

    act(() => api.emitActivity({ modulo: 'servicio_nuevo', usuario: 'u', ugestionId: null, sucursalId: null }))
    act(() => api.emitActivity({ modulo: 'barrido', usuario: 'u', ugestionId: null, sucursalId: null }))

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1), { timeout: ACTIVITY_REFRESH_MS + 3000 })
  })
})

describe('Servicios nuevos page', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('shows the KPIs, the devices and the records table', async () => {
    renderAt('/servicios-nuevos')

    expect(await screen.findByText('Registrados', { selector: 'dt' }, SLOW)).toBeInTheDocument()
    expect(screen.getByText('Hoy', { selector: 'dt' })).toBeInTheDocument()

    const records = await screen.findByRole('table', { name: 'Servicios nuevos registrados' }, SLOW)
    for (const header of ['Fecha', 'Usuario', 'Alias', 'Modelo', 'Estado', 'Sucursal', 'Cliente']) {
      expect(within(records).getByRole('columnheader', { name: header })).toBeInTheDocument()
    }
    expect(within(records).getAllByRole('row').length).toBeGreaterThan(1)
    expect(screen.getByRole('table', { name: 'Dispositivos con actividad' })).toBeInTheDocument()
  })

  it('filters the records with the search box', async () => {
    renderAt('/servicios-nuevos')
    const records = await screen.findByRole('table', { name: 'Servicios nuevos registrados' }, SLOW)
    const before = within(records).getAllByRole('row').length

    fireEvent.change(screen.getByLabelText(/Buscar servicio/), { target: { value: 'zzz-no-existe' } })

    expect(await screen.findByText('Ningún servicio coincide con la búsqueda')).toBeInTheDocument()
    expect(within(records).getAllByRole('row').length).toBeLessThan(before)
  })

  it('shows the empty state without records', async () => {
    const api = new MockDashboardApi({ today: new Date(2026, 10, 1, 12) })
    vi.spyOn(api, 'serviciosNuevos').mockResolvedValue({
      resumen: { registrados: 0, hoy: 0, porEstado: [] },
      porDia: [],
      dispositivos: [],
      registros: [],
    })
    renderAt('/servicios-nuevos', api)

    expect(await screen.findByText('No hay servicios registrados', {}, SLOW)).toBeInTheDocument()
    expect(screen.getByText('Sin servicios registrados en el período')).toBeInTheDocument()
  })

  it('shows a clear error when the request fails', async () => {
    const api = new MockDashboardApi({ today: new Date(2026, 10, 1, 12) })
    vi.spyOn(api, 'serviciosNuevos').mockRejectedValue(new Error('La API respondió 500'))
    renderAt('/servicios-nuevos', api)

    expect(await screen.findByRole('alert', {}, SLOW)).toHaveTextContent('La API respondió 500')
  })
})

describe('map popup', () => {
  it('links to Google Maps, offers Ubicar and escapes the data', () => {
    const html = buildPopup('Cuenta 1', ['<script>alert(1)</script>'], 12.5, -86.25)

    expect(html).toContain('https://www.google.com/maps/search/?api=1&amp;query=12.5,-86.25')
    expect(html).toContain('data-action="locate"')
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>')
  })
})
