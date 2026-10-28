import { describe, expect, it } from 'vitest'
import { CHANGE_TYPE_COLORS } from '@/domain/labels'
import type {
  Catalogs,
  ChangeRow,
  DailyProgress,
  Filters,
  Summary,
  UserRouteProgress,
} from '@/domain/types'
import {
  buildDailyRows,
  buildReportContent,
  formatReportDate,
  formatReportDateTime,
  readableFilters,
  reportFileBase,
  ROWS_WARNING_LIMIT,
  rowLimitWarning,
} from './reportContent'

const catalogs: Catalogs = {
  ugestiones: [
    { id: '1', nombre: 'Unidad de Gestión Managua' },
    { id: '2', nombre: 'Unidad de Gestión Occidente' },
  ],
  sucursales: [{ id: '101', nombre: 'Sucursal Managua', ugestionId: '1' }],
  filiales: [{ id: '01', nombre: '01' }],
  zonas: [{ id: '02', nombre: '02', filial: '01' }],
  rutas: [{ id: '03', nombre: '03', filial: '01', zona: '02' }],
  usuarios: [{ id: 'jmedina', nombre: 'jmedina' }],
}

const filters: Filters = {
  ugestionId: '1',
  sucursalId: '101',
  filial: '01',
  zona: '02',
  ruta: '03',
  usuario: 'jmedina',
  desde: '2026-09-28',
  hasta: '2026-10-27',
  tipoCambio: 'FotoNueva',
}

const summary: Summary = {
  cuentasTrabajadas: 120,
  fotosNuevas: 80,
  fotosActualizadas: 30,
  ubicaciones: 25,
  usuariosActivos: 4,
  avanceRutaPct: 37.5,
}

const progress: UserRouteProgress[] = [
  {
    usuario: 'jmedina',
    filial: '01',
    zona: '02',
    ruta: '03',
    cuentasRuta: 340,
    cuentasTrabajadas: 45,
    fotos: 50,
    ubicaciones: 6,
    ultimaActividad: '2026-10-27T19:42:10Z',
  },
  {
    usuario: 'mlopez',
    filial: '',
    zona: '',
    ruta: '',
    cuentasRuta: 0,
    cuentasTrabajadas: 0,
    fotos: 0,
    ubicaciones: 0,
    ultimaActividad: '2026-10-26T10:00:00Z',
  },
]

const changes: ChangeRow[] = [
  {
    id: '1',
    fecha: '2026-10-27T19:42:10Z',
    usuario: 'jmedina',
    cuenta: '5012',
    cliente: 'MARIA GONZALEZ',
    filial: '01',
    zona: '02',
    ruta: '03',
    tipoCambio: 'FotoNueva',
    origen: 'online',
  },
  {
    id: '2',
    fecha: '2026-10-26T10:00:00Z',
    usuario: 'mlopez',
    cuenta: '5013',
    cliente: 'JUAN PEREZ',
    filial: '',
    zona: '',
    ruta: '',
    tipoCambio: 'UbicacionCorregida',
    origen: 'offline',
  },
]

const daily: DailyProgress[] = [
  { fecha: '2026-10-26', usuario: 'jmedina', tipoCambio: 'FotoNueva', cambios: 3 },
  { fecha: '2026-10-26', usuario: 'mlopez', tipoCambio: 'UbicacionCorregida', cambios: 2 },
  { fecha: '2026-10-27', usuario: 'jmedina', tipoCambio: 'FotoActualizada', cambios: 4 },
]

function content() {
  return buildReportContent({
    filters,
    catalogs,
    summary,
    progress,
    changes,
    daily,
    usuario: 'jmedina',
    generatedAt: new Date(2026, 9, 27, 21, 5),
    environment: 'PRUEBAS',
  })
}

describe('readable filters', () => {
  it('shows names instead of ids', () => {
    const lines = readableFilters(filters, catalogs)

    expect(lines).toEqual([
      { label: 'Unidad de gestión', value: 'Unidad de Gestión Managua' },
      { label: 'Sucursal', value: 'Sucursal Managua' },
      { label: 'Filial', value: '01' },
      { label: 'Zona', value: '02' },
      { label: 'Ruta', value: '03' },
      { label: 'Usuario', value: 'jmedina' },
      { label: 'Tipo de cambio', value: 'Foto nueva' },
      { label: 'Período', value: '28/09/2026 a 27/10/2026' },
    ])
  })

  it('says "Todos/Todas" when a filter is not set', () => {
    const lines = readableFilters({ desde: '2026-09-28', hasta: '2026-10-27' }, catalogs)

    expect(lines.map((line) => line.value)).toEqual([
      'Todas',
      'Todas',
      'Todas',
      'Todas',
      'Todas',
      'Todos',
      'Todos',
      '28/09/2026 a 27/10/2026',
    ])
  })
})

describe('report content', () => {
  it('builds the meta, the period and the file name', () => {
    const report = content()

    expect(report.meta).toEqual({
      title: 'Seguimiento catastral',
      usuario: 'jmedina',
      generatedAt: new Date(2026, 9, 27, 21, 5),
      environment: 'PRUEBAS',
      fileBase: 'AquaSync Catastro – Reporte 2026-09-28 a 2026-10-27',
    })
    expect(report.period.label).toBe('28/09/2026 a 27/10/2026')
    expect(reportFileBase(filters)).toBe('AquaSync Catastro – Reporte 2026-09-28 a 2026-10-27')
  })

  it('maps the KPIs with their formatted value, raw value and colour', () => {
    const report = content()

    expect(report.kpis).toHaveLength(6)
    expect(report.kpis[0]).toMatchObject({ key: 'cuentasTrabajadas', value: '120', raw: 120 })
    expect(report.kpis[5]).toMatchObject({ key: 'avanceRutaPct', value: '37.5 %', raw: 37.5 })
    expect(new Set(report.kpis.map((kpi) => kpi.color)).size).toBeGreaterThan(1)
  })

  it('keeps a null route percentage as an empty value', () => {
    const report = buildReportContent({
      filters,
      catalogs,
      summary: { ...summary, avanceRutaPct: null },
      progress,
      changes,
      daily,
      usuario: 'jmedina',
      generatedAt: new Date(),
      environment: 'PRUEBAS',
    })

    expect(report.kpis[5].raw).toBeNull()
    expect(report.kpis[5].value).toBe('—')
  })

  it('builds the route rows with real dates and a 0..1 progress', () => {
    const report = content()

    expect(report.routes[0]).toMatchObject({
      usuario: 'jmedina',
      cuentasRuta: 340,
      cuentasTrabajadas: 45,
      avance: 45 / 340,
    })
    expect(report.routes[0].ultimaActividad).toBeInstanceOf(Date)
    expect(report.routeTotals).toMatchObject({
      cuentasRuta: 340,
      cuentasTrabajadas: 45,
      fotos: 50,
      ubicaciones: 6,
    })
  })

  it('builds the change rows with real dates and the change-type colour', () => {
    const report = content()

    expect(report.changes[0].fecha).toBeInstanceOf(Date)
    expect(report.changes[0].tipoLabel).toBe('Foto nueva')
    expect(report.changes[0].tipoColor).toBe(CHANGE_TYPE_COLORS.FotoNueva)
    expect(report.changes[1].tipoColor).toBe(CHANGE_TYPE_COLORS.UbicacionCorregida)
  })

  it('pivots the daily activity per date and type with a total', () => {
    const rows = buildDailyRows(daily)

    expect(rows).toHaveLength(2)
    expect(rows[0].fecha).toBeInstanceOf(Date)
    expect(rows[0]).toMatchObject({ FotoNueva: 3, UbicacionCorregida: 2, total: 5 })
    expect(rows[1]).toMatchObject({ FotoActualizada: 4, total: 4 })
  })
})

describe('row limit warning', () => {
  it('stays quiet up to the limit', () => {
    expect(rowLimitWarning(0)).toBeNull()
    expect(rowLimitWarning(ROWS_WARNING_LIMIT)).toBeNull()
  })

  it('warns and suggests narrowing the period above the limit', () => {
    const warning = rowLimitWarning(ROWS_WARNING_LIMIT + 1)

    expect(warning).toContain('20,001')
    expect(warning).toContain('20,000')
    expect(warning).toMatch(/período|filtros/)
  })
})

describe('date helpers', () => {
  it('formats dates and date-times for the report', () => {
    const date = new Date(2026, 9, 27, 9, 5)

    expect(formatReportDate(date)).toBe('27/10/2026')
    expect(formatReportDateTime(date)).toBe('27/10/2026 09:05')
  })
})
