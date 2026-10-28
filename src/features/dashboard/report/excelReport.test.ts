import ExcelJS from 'exceljs'
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
import { buildReportContent } from './reportContent'
import { argb, buildExcelWorkbook, excelFileName, lightTint } from './excelReport'

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

const catalogs: Catalogs = {
  ugestiones: [{ id: '1', nombre: 'Unidad de Gestión Managua' }],
  sucursales: [{ id: '101', nombre: 'Sucursal Managua', ugestionId: '1' }],
  filiales: [],
  zonas: [],
  rutas: [],
  usuarios: [{ id: 'jmedina', nombre: 'jmedina' }],
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

const fillOf = (cell: ExcelJS.Cell) => {
  const fill = cell.fill as { fgColor?: { argb?: string } } | undefined
  return String(fill?.fgColor?.argb ?? '').toUpperCase()
}

interface ConditionalFormattingRuleLike {
  rules: Array<{ type: string }>
}

function conditionalRules(sheet: ExcelJS.Worksheet): ConditionalFormattingRuleLike[] {
  return (sheet as unknown as { conditionalFormattings?: ConditionalFormattingRuleLike[] })
    .conditionalFormattings ?? []
}

/** Row of a label in the cover, so the test does not depend on fixed offsets. */
function labelRow(sheet: ExcelJS.Worksheet, label: string): number {
  let found = 0
  sheet.eachRow((row, index) => {
    row.eachCell((cell) => {
      if (cell.value === label) found = index
    })
  })
  return found
}

describe('excel report', () => {
  it('creates the four worksheets of the report', () => {
    const workbook = buildExcelWorkbook(content())

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      'Resumen',
      'Avance por ruta',
      'Detalle de cambios',
      'Actividad diaria',
    ])
  })

  it('builds the cover with the title band, the readable filters and the KPIs', () => {
    const workbook = buildExcelWorkbook(content())
    const cover = workbook.getWorksheet('Resumen')!

    expect(cover.getCell('A1').value).toContain('Seguimiento catastral')
    expect(fillOf(cover.getCell('A1'))).toBe(argb(CHANGE_TYPE_COLORS.FotoNueva))

    const texts = new Set<string>()
    cover.eachRow((row) =>
      row.eachCell((cell) => {
        if (cell.value !== null && cell.value !== undefined) texts.add(String(cell.value))
      }),
    )

    expect(texts.has('Unidad de Gestión Managua')).toBe(true)
    expect(texts.has('Sucursal Managua')).toBe(true)
    expect(texts.has('Cuentas trabajadas')).toBe(true)
    expect(texts.has('Ambiente: PRUEBAS')).toBe(true)
    expect([...texts].some((value) => value.includes('Generado por jmedina'))).toBe(true)
  })

  it('uses a light tint of the KPI colour as the value fill', () => {
    const workbook = buildExcelWorkbook(content())
    const cover = workbook.getWorksheet('Resumen')!

    const row = labelRow(cover, 'Cuentas trabajadas')
    const kpiCell = cover.getCell(`C${row}`)

    expect(fillOf(kpiCell)).toBe(lightTint(CHANGE_TYPE_COLORS.FotoNueva))
    expect(fillOf(kpiCell)).not.toBe(argb(CHANGE_TYPE_COLORS.FotoNueva))
  })

  it('styles the routes sheet: header, freeze, autofilter, percent, data bars and totals', () => {
    const workbook = buildExcelWorkbook(content())
    const sheet = workbook.getWorksheet('Avance por ruta')!

    expect(fillOf(sheet.getCell('A1'))).toBe(argb(CHANGE_TYPE_COLORS.FotoNueva))
    expect(sheet.getCell('A1').font?.bold).toBe(true)
    expect(sheet.getCell('A1').font?.color?.argb).toBe('FFFFFFFF')
    expect(sheet.views[0]).toMatchObject({ state: 'frozen', xSplit: 1, ySplit: 1 })
    // Header plus data rows: a filter limited to row 1 would not filter anything.
    expect(sheet.autoFilter).toMatchObject({
      from: { row: 1, column: 1 },
      to: { row: 2, column: 10 },
    })
    expect(sheet.getCell('E2').numFmt).toBe('#,##0')
    expect(sheet.getCell('I2').numFmt).toBe('0%')
    expect(sheet.getCell('J2').numFmt).toBe('dd/mm/yyyy hh:mm')
    expect(sheet.getCell('J2').value).toBeInstanceOf(Date)

    const rules = conditionalRules(sheet).flatMap((formatting) => formatting.rules)
    expect(rules.some((rule) => rule.type === 'dataBar')).toBe(true)

    const lastRow = sheet.rowCount
    expect(sheet.getCell(`A${lastRow}`).value).toBe('Totales')
    expect(sheet.getCell(`A${lastRow}`).font?.bold).toBe(true)
    expect(sheet.getCell(`E${lastRow}`).value).toBe(340)
  })

  it('writes the changes with real dates, zebra rows and the type colour', () => {
    const workbook = buildExcelWorkbook(content())
    const sheet = workbook.getWorksheet('Detalle de cambios')!

    expect(sheet.autoFilter).toMatchObject({
      from: { row: 1, column: 1 },
      to: { row: 3, column: 9 },
    })

    expect(sheet.getCell('A2').value).toBeInstanceOf(Date)
    expect(sheet.getCell('A2').numFmt).toBe('dd/mm/yyyy hh:mm')
    expect(sheet.getCell('H2').value).toBe('Foto nueva')
    expect(fillOf(sheet.getCell('H2'))).toBe(lightTint(CHANGE_TYPE_COLORS.FotoNueva, 0.8))
    expect(sheet.getCell('H2').font?.color?.argb).toBe(argb(CHANGE_TYPE_COLORS.FotoNueva))
    expect(fillOf(sheet.getCell('H3'))).toBe(lightTint(CHANGE_TYPE_COLORS.UbicacionCorregida, 0.8))
    // Zebra on the second data row only.
    expect(fillOf(sheet.getCell('A3'))).toBe('FFF7F9FC')
  })

  it('writes the daily activity ready to chart', () => {
    const workbook = buildExcelWorkbook(content())
    const sheet = workbook.getWorksheet('Actividad diaria')!

    expect(sheet.getCell('A1').value).toBe('Fecha')
    expect(sheet.getCell('F1').value).toBe('Total')
    expect(sheet.getCell('A2').value).toBeInstanceOf(Date)
    expect(sheet.getCell('A2').numFmt).toBe('dd/mm/yyyy')
    expect(sheet.getCell('F2').value).toBe(3)
    expect(sheet.getCell('F2').font?.bold).toBe(true)
  })

  it('sets the workbook properties and the print setup', () => {
    const workbook = buildExcelWorkbook(content())

    expect(workbook.creator).toBe('AquaSync Catastro')
    expect(workbook.title).toBe('Seguimiento catastral')
    expect(workbook.created).toEqual(new Date(2026, 9, 27, 21, 5))

    const routes = workbook.getWorksheet('Avance por ruta')!
    expect(routes.pageSetup.orientation).toBe('landscape')
    expect(routes.pageSetup.fitToPage).toBe(true)
    expect(routes.pageSetup.fitToWidth).toBe(1)
    expect(routes.headerFooter.oddFooter).toContain('Página &P de &N')
    expect(routes.headerFooter.oddHeader).toContain('PRUEBAS')
  })

  it('names the file after the period', () => {
    expect(excelFileName(content())).toBe(
      'AquaSync Catastro – Reporte 2026-09-28 a 2026-10-27.xlsx',
    )
  })
})
