import { describe, expect, it, vi } from 'vitest'
import { MockDashboardApi } from './MockDashboardApi'
import type { Filters, LiveChange } from '../../domain/types'
import type { LiveStatus } from '../../ports/DashboardApi'
import { dateKeyOf, lastDaysRange } from '../../shared/dates'

const ANCHOR = new Date(2026, 9, 27) // 2026-10-27, local time
const createApi = () => new MockDashboardApi({ today: ANCHOR })
const baseFilters = (): Filters => lastDaysRange(30, ANCHOR)

async function allRows(api: MockDashboardApi, filters: Filters) {
  const page = await api.changes({ ...filters }, 1, 10_000)
  return page
}

describe('MockDashboardApi filters', () => {
  it('narrows the detail rows by route', async () => {
    const api = createApi()
    const route = (await api.catalogs()).rutas[0]
    const unfiltered = await allRows(api, baseFilters())
    const filtered = await allRows(api, { ...baseFilters(), ruta: route.nombre })

    expect(filtered.total).toBeGreaterThan(0)
    expect(filtered.total).toBeLessThan(unfiltered.total)
    expect(filtered.rows.every((row) => row.ruta === route.nombre)).toBe(true)
  })

  it('narrows the detail rows by user', async () => {
    const api = createApi()
    const usuario = (await api.catalogs()).usuarios[0]
    const unfiltered = await allRows(api, baseFilters())
    const filtered = await allRows(api, { ...baseFilters(), usuario: usuario.id })

    expect(filtered.total).toBeGreaterThan(0)
    expect(filtered.total).toBeLessThan(unfiltered.total)
    expect(filtered.rows.every((row) => row.usuario === usuario.id)).toBe(true)
  })

  it('narrows the detail rows by date range', async () => {
    const api = createApi()
    const unfiltered = await allRows(api, baseFilters())
    const oneDay = dateKeyOf(unfiltered.rows[0].fecha)
    const filtered = await allRows(api, { desde: oneDay, hasta: oneDay })

    expect(filtered.total).toBeGreaterThan(0)
    expect(filtered.total).toBeLessThan(unfiltered.total)
    expect(filtered.rows.every((row) => dateKeyOf(row.fecha) === oneDay)).toBe(true)
  })

  it('narrows the detail rows by change type', async () => {
    const api = createApi()
    const filtered = await allRows(api, { ...baseFilters(), tipoCambio: 'FotoNueva' })

    expect(filtered.total).toBeGreaterThan(0)
    expect(filtered.rows.every((row) => row.tipoCambio === 'FotoNueva')).toBe(true)
  })

  it('narrows the detail rows by gestión and sucursal', async () => {
    const api = createApi()
    const catalogs = await api.catalogs()
    const sucursal = catalogs.sucursales[0]
    const bySucursal = await allRows(api, { ...baseFilters(), sucursalId: sucursal.id })
    const byUgestion = await allRows(api, { ...baseFilters(), ugestionId: sucursal.ugestionId })

    expect(bySucursal.total).toBeGreaterThan(0)
    expect(bySucursal.total).toBeLessThanOrEqual(byUgestion.total)
    expect(byUgestion.total).toBeLessThan((await allRows(api, baseFilters())).total)
  })
})

describe('MockDashboardApi aggregation', () => {
  it('reports a summary that matches the filtered detail rows', async () => {
    const api = createApi()
    const filters = { ...baseFilters(), filial: (await api.catalogs()).filiales[0].nombre }
    const { rows } = await allRows(api, filters)
    const summary = await api.summary(filters)

    const count = (tipo: string) => rows.filter((row) => row.tipoCambio === tipo).length
    expect(summary.cuentasTrabajadas).toBe(new Set(rows.map((row) => row.cuenta)).size)
    expect(summary.fotosNuevas).toBe(count('FotoNueva'))
    expect(summary.fotosActualizadas).toBe(count('FotoActualizada'))
    expect(summary.ubicaciones).toBe(count('UbicacionNueva') + count('UbicacionCorregida'))
    expect(summary.usuariosActivos).toBe(new Set(rows.map((row) => row.usuario)).size)
    expect(summary.avanceRutaPct).toBeGreaterThanOrEqual(0)
    expect(summary.avanceRutaPct).toBeLessThanOrEqual(100)
  })

  it('returns an empty summary for a range with no activity', async () => {
    const api = createApi()
    const summary = await api.summary({ desde: '2001-01-01', hasta: '2001-01-02' })

    expect(summary).toEqual({
      cuentasTrabajadas: 0,
      fotosNuevas: 0,
      fotosActualizadas: 0,
      ubicaciones: 0,
      usuariosActivos: 0,
      avanceRutaPct: 0,
    })
  })

  it('counts daily progress so the days add up to the detail rows', async () => {
    const api = createApi()
    const filters = baseFilters()
    const { total } = await allRows(api, filters)
    const daily = await api.dailyProgress(filters)

    const sum = daily.reduce((acc, row) => acc + row.cambios, 0)
    expect(sum).toBe(total)
    expect(daily.every((row) => row.cambios > 0)).toBe(true)
  })

  it('reports per-user route progress honoring the filters', async () => {
    const api = createApi()
    const filters = { ...baseFilters(), ruta: (await api.catalogs()).rutas[0].nombre }
    const progress = await api.userRouteProgress(filters)
    const { rows } = await allRows(api, filters)

    expect(progress.length).toBeGreaterThan(0)
    expect(progress.every((row) => row.ruta === filters.ruta)).toBe(true)
    expect(progress.reduce((acc, row) => acc + row.cuentasTrabajadas, 0)).toBe(
      new Set(rows.map((row) => row.cuenta)).size,
    )
    expect(progress.every((row) => row.cuentasTrabajadas <= row.cuentasRuta)).toBe(true)
  })

  it('returns map points inside Nicaragua, one per account', async () => {
    const api = createApi()
    const filters = baseFilters()
    const points = await api.mapPoints(filters)
    const { rows } = await allRows(api, filters)

    expect(points.length).toBeGreaterThan(0)
    expect(new Set(points.map((point) => point.cuenta)).size).toBe(points.length)
    expect(new Set(points.map((point) => point.cuenta)).size).toBeLessThanOrEqual(rows.length)
    expect(
      points.every(
        (point) =>
          point.lat >= 10.7 && point.lat <= 15.0 && point.lng >= -87.7 && point.lng <= -83.1,
      ),
    ).toBe(true)
  })

  it('paginates the detail rows without gaps or repeats', async () => {
    const api = createApi()
    const filters = baseFilters()
    const first = await api.changes(filters, 1, 10)
    const second = await api.changes(filters, 2, 10)
    const everything = await allRows(api, filters)

    expect(first.rows).toHaveLength(10)
    expect(first.total).toBe(everything.total)
    expect(first.rows.map((row) => row.id)).not.toContain(second.rows[0].id)
    expect(everything.rows[0].id).toBe(first.rows[0].id)
    expect(new Date(everything.rows[0].fecha).getTime()).toBeGreaterThanOrEqual(
      new Date(everything.rows[1].fecha).getTime(),
    )
  })
})

describe('MockDashboardApi session', () => {
  it('accepts any non-empty credentials', async () => {
    const session = await createApi().login('jmedina', 'cualquier-clave')

    expect(session.usuario).toBe('jmedina')
    expect(session.token).not.toBe('')
  })

  it('rejects empty credentials', async () => {
    await expect(createApi().login('', 'clave')).rejects.toThrow()
    await expect(createApi().login('jmedina', '')).rejects.toThrow()
  })
})

describe('MockDashboardApi live channel', () => {
  it('reports the live status as soon as someone subscribes', () => {
    const statuses: LiveStatus[] = []
    const unsubscribe = createApi().subscribeChanges(
      () => {},
      (status) => statuses.push(status),
    )

    expect(statuses).toContain('live')
    unsubscribe()
  })

  it('pushes a change every 5 to 10 seconds and stops after unsubscribing', () => {
    const api = createApi()
    const received: LiveChange[] = []

    vi.useFakeTimers()
    const unsubscribe = api.subscribeChanges((change) => received.push(change))
    vi.advanceTimersByTime(10_000)

    expect(received).toHaveLength(1)
    expect(received[0].cuenta).toMatch(/^CTA-/)
    expect(received[0].ruta).not.toBe('')

    unsubscribe()
    vi.advanceTimersByTime(60_000)
    expect(received).toHaveLength(1)
    expect(vi.getTimerCount()).toBe(0)
    vi.useRealTimers()
  })

  it('adds the live change to the mock data so the totals stay consistent', async () => {
    const filters: Filters = { desde: '2000-01-01', hasta: '2100-01-01' }
    const api = createApi()
    const before = await api.changes(filters, 1, 10)
    let received: LiveChange | undefined

    vi.useFakeTimers()
    const unsubscribe = api.subscribeChanges((change) => {
      received = change
    })
    vi.advanceTimersByTime(10_000)
    vi.useRealTimers()
    unsubscribe()

    const after = await api.changes(filters, 1, 10)
    expect(after.total).toBe(before.total + 1)
    expect(after.rows[0].id).toBe(received?.id)
  })
})

describe('MockDashboardApi cobertura de ruta', () => {
  it('requires filial, zona and ruta, as the API does', async () => {
    const api = createApi()

    await expect(api.routeCoverage(baseFilters())).rejects.toThrow(
      'Seleccioná filial, zona y ruta para ver la cobertura',
    )
  })

  it('returns trabajadas, pendientes and fuera de ruta for a route', async () => {
    const api = createApi()
    const routes = (await api.catalogs()).rutas
    let found: Awaited<ReturnType<typeof api.routeCoverage>> | undefined

    for (const ruta of routes) {
      const coverage = await api.routeCoverage({
        ...baseFilters(),
        filial: ruta.filial,
        zona: ruta.zona,
        ruta: ruta.nombre,
      })
      if (coverage.trabajadas > 0 && coverage.pendientes > 0 && coverage.fueraDeRuta > 0) {
        found = coverage
        break
      }
    }

    expect(found).toBeDefined()
    const estados = new Set(found?.cuentas.map((account) => account.estado))
    expect(estados).toEqual(new Set(['trabajada', 'pendiente', 'fuera_de_ruta']))
    expect(found?.cuentasRuta).toBe((found?.trabajadas ?? 0) + (found?.pendientes ?? 0))
    expect(found?.avancePct).toBeCloseTo(((found?.trabajadas ?? 0) * 100) / (found?.cuentasRuta ?? 1), 1)
  })
})

describe('MockDashboardApi ranking de rutas', () => {
  it('requires a unidad de gestión or sucursal, as the API does', async () => {
    const api = createApi()

    await expect(api.routeRanking(baseFilters())).rejects.toThrow(
      'Seleccioná una unidad de gestión o sucursal para ver el ranking de rutas',
    )
  })

  it('lists the routes of the unit worst first, including routes with no work', async () => {
    const api = createApi()
    // Unit 4 (Madriz) has RT-SOM-02 with no user yet: the one route with no work in the mock.
    const ugestionId = '4'

    const rows = await api.routeRanking({ ...baseFilters(), ugestionId })

    const avances = rows.map((row) => row.avancePct)
    expect(rows.length).toBeGreaterThan(1)
    expect([...avances].sort((a, b) => a - b)).toEqual(avances)
    expect(rows.some((row) => row.trabajadas === 0)).toBe(true)
    expect(rows.some((row) => row.trabajadas > 0)).toBe(true)
    for (const row of rows) {
      expect(row.pendientes).toBe(row.cuentasRuta - row.trabajadas)
    }
  })
})
