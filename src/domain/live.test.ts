import { describe, expect, it } from 'vitest'
import { accumulateLive, liveDeltaSince, livePointsSince, matchesFilters } from './live'
import type { Filters, LiveChange } from './types'

const filters: Filters = { desde: '2026-10-01', hasta: '2026-10-31' }

function change(overrides: Partial<LiveChange> = {}): LiveChange {
  return {
    id: 'C-1',
    fecha: '2026-10-27T10:00:00.000Z',
    usuario: 'jperez',
    cuenta: '5012',
    cliente: 'MARIA GONZALEZ',
    filial: '01',
    zona: '02',
    ruta: '03',
    tipoCambio: 'FotoNueva',
    origen: 'online',
    ...overrides,
  }
}

function received(item: LiveChange, recibidoEn: string) {
  return { ...item, recibidoEn }
}

describe('matchesFilters', () => {
  it('accepts a change inside the date range', () => {
    expect(matchesFilters(change(), filters)).toBe(true)
  })

  it('rejects a change outside the date range', () => {
    expect(matchesFilters(change({ fecha: '2026-09-01T10:00:00.000Z' }), filters)).toBe(false)
  })

  it('checks the organizational ids the live payload carries', () => {
    const scoped: Filters = { ...filters, ugestionId: '5', sucursalId: '7' }

    expect(matchesFilters(change({ ugestionId: '5', sucursalId: '7' }), scoped)).toBe(true)
    expect(matchesFilters(change({ ugestionId: '9', sucursalId: '7' }), scoped)).toBe(false)
    expect(matchesFilters(change({ ugestionId: '5', sucursalId: '9' }), scoped)).toBe(false)
  })

  it('accepts optimistically when the transport does not send the ids', () => {
    const scoped: Filters = { ...filters, ugestionId: '5', sucursalId: '7' }

    expect(matchesFilters(change(), scoped)).toBe(true)
  })

  it('checks route, zone, filial, user and change type', () => {
    expect(matchesFilters(change(), { ...filters, ruta: '03' })).toBe(true)
    expect(matchesFilters(change(), { ...filters, ruta: '04' })).toBe(false)
    expect(matchesFilters(change(), { ...filters, zona: '09' })).toBe(false)
    expect(matchesFilters(change(), { ...filters, filial: '09' })).toBe(false)
    expect(matchesFilters(change(), { ...filters, usuario: 'mlopez' })).toBe(false)
    expect(matchesFilters(change(), { ...filters, tipoCambio: 'UbicacionNueva' })).toBe(false)
  })
})

describe('live window', () => {
  const items = [
    received(change({ id: 'old', cuenta: '1' }), '2026-10-27T10:00:00.000Z'),
    received(
      change({ id: 'new', cuenta: '2', usuario: 'mlopez', lat: 12.14, lng: -86.25 }),
      '2026-10-27T10:00:06.000Z',
    ),
  ]
  const since = new Date('2026-10-27T10:00:05.000Z').getTime()

  it('counts only the changes received after the last load', () => {
    const delta = liveDeltaSince(items, since)

    expect(delta.eventos).toBe(1)
    expect(delta.fotosNuevas).toBe(1)
    expect(delta.cuentasNuevas).toBe(1)
    expect(delta.usuariosNuevos).toBe(1)
  })

  it('does not count an account or user the snapshot already knows', () => {
    const delta = liveDeltaSince(items, since, {
      cuentas: new Set(['2']),
      usuarios: new Set(['mlopez']),
    })

    expect(delta.cuentasNuevas).toBe(0)
    expect(delta.usuariosNuevos).toBe(0)
  })

  it('accumulates one event per change type', () => {
    const delta = accumulateLive(accumulateLive(
      { fotosNuevas: 0, fotosActualizadas: 0, ubicaciones: 0, eventos: 0, cuentasNuevas: 0, usuariosNuevos: 0 },
      change({ tipoCambio: 'UbicacionCorregida' }),
    ), change({ tipoCambio: 'FotoActualizada' }))

    expect(delta).toMatchObject({ eventos: 2, ubicaciones: 1, fotosActualizadas: 1 })
  })

  it('returns map points only for changes in the window, one per account', () => {
    const points = livePointsSince(items, since)

    expect(points).toHaveLength(1)
    expect(points[0]).toMatchObject({ cuenta: '2', usuario: 'mlopez' })
  })

  it('skips changes without coordinates', () => {
    const withoutCoordinates = [received(change(), '2026-10-27T10:00:06.000Z')]

    expect(livePointsSince(withoutCoordinates, 0)).toHaveLength(0)
  })
})
