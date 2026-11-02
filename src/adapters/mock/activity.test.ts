import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../domain/errors'
import type { Filters } from '../../domain/types'
import { MockDashboardApi } from './MockDashboardApi'

const TODAY = new Date(2026, 10, 1, 12)
const WIDE: Filters = { desde: '2026-10-01', hasta: '2026-11-02' }

function api() {
  return new MockDashboardApi({ today: TODAY })
}

describe('mock barrido', () => {
  it('lists assignments with consistent progress', async () => {
    const rows = await api().barridoAsignaciones(WIDE)
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(row.encuestadas + row.pendientes).toBe(row.asignadas)
      expect(row.avance).toBeCloseTo((row.encuestadas / row.asignadas) * 100, 0)
    }
    expect(rows.some((row) => row.encuestadas === 0)).toBe(true)
    expect(rows.some((row) => row.encuestadas > 0)).toBe(true)
  })

  it('activity totals agree with the points, devices and days', async () => {
    const data = await api().barridoActividad(WIDE, {})
    expect(data.resumen.encuestas).toBe(data.puntos.length)
    expect(data.resumen.dispositivos).toBe(data.dispositivos.length)
    expect(data.porDia.reduce((total, row) => total + row.cantidad, 0)).toBe(data.resumen.encuestas)
    expect(data.dispositivos.reduce((total, row) => total + row.cantidad, 0)).toBe(data.resumen.encuestas)
  })

  it('narrows the activity to one assignment', async () => {
    const mock = api()
    const [started] = (await mock.barridoAsignaciones(WIDE)).filter((row) => row.encuestadas > 0)
    const data = await mock.barridoActividad(WIDE, { cliBarridoId: started.cliBarridoId, periodo: started.periodoId })
    expect(data.resumen.encuestas).toBe(started.encuestadas)
  })

  it('returns the pending accounts of an assignment and rejects missing params', async () => {
    const mock = api()
    const [row] = await mock.barridoAsignaciones(WIDE)
    const pending = await mock.barridoPendientes({ usrId: row.usrId, cliBarridoId: row.cliBarridoId, periodo: row.periodoId })
    expect(pending).toHaveLength(row.pendientes)
    await expect(mock.barridoPendientes({ usrId: '', cliBarridoId: '', periodo: '' })).rejects.toBeInstanceOf(ApiError)
  })

  it('respects the date range', async () => {
    const data = await api().barridoActividad({ desde: '2020-01-01', hasta: '2020-01-02' }, {})
    expect(data.resumen.encuestas).toBe(0)
  })
})

describe('mock servicios nuevos', () => {
  it('returns resumen, records and estado counts', async () => {
    const data = await api().serviciosNuevos(WIDE)
    expect(data.resumen.registrados).toBe(data.registros.length)
    expect(data.resumen.porEstado.length).toBeGreaterThan(0)
    expect(data.registros[0]).toMatchObject({ alias: expect.stringMatching(/^Dispositivo /), estado: expect.any(String) })
  })
})

describe('mock activity channel', () => {
  it('delivers an emitted notice until unsubscribed', () => {
    const mock = api()
    const listener = vi.fn()
    const off = mock.subscribeActivity(listener)
    mock.emitActivity({ modulo: 'barrido', usuario: 'u', ugestionId: null, sucursalId: null })
    expect(listener).toHaveBeenCalledTimes(1)
    off()
    mock.emitActivity({ modulo: 'barrido', usuario: 'u', ugestionId: null, sucursalId: null })
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
