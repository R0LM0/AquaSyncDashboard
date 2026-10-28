import { describe, expect, it } from 'vitest'
import { CHANGE_TYPE_COLORS } from '@/domain/labels'
import type { Catalogs, ChangeRow, Filters, Summary, UserRouteProgress } from '@/domain/types'
import { buildPdfSections, buildChangesTable, buildRoutesTable } from './pdfSections'
import { buildReportContent, REPORT_LAYOUT } from './reportContent'

const filters: Filters = {
  ugestionId: '1',
  filial: '01',
  desde: '2026-09-28',
  hasta: '2026-10-27',
}

const catalogs: Catalogs = {
  ugestiones: [{ id: '1', nombre: 'Unidad de Gestión Managua' }],
  sucursales: [],
  filiales: [],
  zonas: [],
  rutas: [],
  usuarios: [],
}

const summary: Summary = {
  cuentasTrabajadas: 1200,
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
    tipoCambio: 'UbicacionCorregida',
    origen: 'online',
  },
]

function content() {
  return buildReportContent({
    filters,
    catalogs,
    summary,
    progress,
    changes,
    daily: [],
    usuario: 'jmedina',
    generatedAt: new Date(2026, 9, 27, 21, 5),
    environment: 'PRUEBAS',
  })
}

describe('pdf sections', () => {
  it('builds the cover with the period, the environment and the readable filters', () => {
    const { cover } = buildPdfSections(content())

    expect(cover.title).toBe('Seguimiento catastral')
    expect(cover.subtitle).toContain('AquaSync Catastro – Reporte 2026-09-28 a 2026-10-27')
    expect(cover.subtitle).toContain('PRUEBAS')
    expect(cover.period).toBe('Período: 28/09/2026 a 27/10/2026')
    expect(cover.environment).toBe('PRUEBAS')
    expect(cover.filters).toContainEqual({ label: 'Unidad de gestión', value: 'Unidad de Gestión Managua' })
    expect(cover.footer).toBe('Generado por jmedina · 27/10/2026 21:05')
  })

  it('builds the KPI cards with the dashboard colours', () => {
    const { cover } = buildPdfSections(content())

    expect(cover.kpis).toHaveLength(6)
    expect(cover.kpis[0]).toEqual({
      label: 'Cuentas trabajadas',
      value: '1,200',
      color: CHANGE_TYPE_COLORS.FotoNueva,
    })
    expect(cover.kpis[5].value).toBe('37.5 %')
  })

  it('puts the routes table with its headers and formatted values', () => {
    const table = buildRoutesTable(content())

    expect(table.title).toBe('Avance por ruta')
    expect(table.head).toEqual([...REPORT_LAYOUT.routeHeaders])
    expect(table.body[0]).toEqual([
      'jmedina',
      '01',
      '02',
      '03',
      '340',
      '45',
      '50',
      '6',
      '13 %',
      expect.stringMatching(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/),
    ])
    expect(table.body[1].slice(1, 4)).toEqual(['—', '—', '—'])
  })

  it('puts the change rows with the type label and its colour', () => {
    const table = buildChangesTable(content())

    expect(table.head).toEqual([...REPORT_LAYOUT.changeHeaders])
    expect(table.body[0][7]).toBe('Ubicación corregida')
    expect(table.rowColors).toEqual([CHANGE_TYPE_COLORS.UbicacionCorregida])
    expect(table.accentColumn).toBe(7)
  })

  it('returns both tables in order', () => {
    const { tables } = buildPdfSections(content())

    expect(tables.map((table) => table.title)).toEqual(['Avance por ruta', 'Detalle de cambios'])
  })
})
