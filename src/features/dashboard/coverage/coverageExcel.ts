import ExcelJS from 'exceljs'
import { CHANGE_TYPE_COLORS } from '@/domain/labels'
import type { CoverageAccount, RouteCoverage } from '@/domain/types'
import { argb, lightTint } from '../report/excelReport'
import { REPORT_AUTHOR, REPORT_TITLE } from '../report/reportContent'
import { ESTADO_COLORS, ESTADO_LABELS, routeLabel, workedPerUser } from './coverageAggregates'

/** Same brand colour as the other reports, so the files read as one family. */
export const PRIMARY = CHANGE_TYPE_COLORS.FotoNueva
export const BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFD6DDE8' } },
  left: { style: 'thin', color: { argb: 'FFD6DDE8' } },
  bottom: { style: 'thin', color: { argb: 'FFD6DDE8' } },
  right: { style: 'thin', color: { argb: 'FFD6DDE8' } },
}
const DATE_FORMAT = 'dd/mm/yyyy hh:mm'

export type Cell = string | number | Date | null

function cellValue(value: string | null): string {
  return value ?? ''
}

export function styleHeader(row: ExcelJS.Row, columns: number, color: string): void {
  for (let index = 1; index <= columns; index += 1) {
    const cell = row.getCell(index)
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(color) } }
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = BORDER
  }
  row.height = 22
}

export function setupPrint(sheet: ExcelJS.Worksheet, title: string): void {
  sheet.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
  }
  sheet.headerFooter = {
    oddHeader: `&L&"Calibri,Bold"${title}`,
    oddFooter: '&LAquaSync Catastro&CPágina &P de &N',
  }
}

/** A sheet of one table: frozen and filterable header, bordered body, dates as real dates. */
export function listSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  title: string,
  headers: string[],
  widths: number[],
  rows: Cell[][],
  color: string,
): void {
  const sheet = workbook.addWorksheet(name, {
    properties: { tabColor: { argb: argb(color) } },
    views: [{ state: 'frozen', ySplit: 1 }],
  })
  sheet.columns = widths.map((width) => ({ width }))

  styleHeader(sheet.addRow(headers), headers.length, color)
  for (const values of rows) {
    const row = sheet.addRow(values)
    row.eachCell((cell, column) => {
      cell.border = BORDER
      cell.font = { size: 10 }
      if (values[column - 1] instanceof Date) cell.numFmt = DATE_FORMAT
    })
  }

  if (rows.length > 0) {
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } }
  }
  setupPrint(sheet, title)
}

function accountRow(account: CoverageAccount): Cell[] {
  return [Number(account.cuenta), cellValue(account.cliente), cellValue(account.direccion)]
}

function workedRow(account: CoverageAccount): Cell[] {
  return [
    Number(account.cuenta),
    cellValue(account.cliente),
    cellValue(account.direccion),
    account.usuario,
    account.primeraActividad ? new Date(account.primeraActividad) : null,
    account.ultimaActividad ? new Date(account.ultimaActividad) : null,
    account.fotos,
    account.ubicaciones,
  ]
}

function buildSummarySheet(workbook: ExcelJS.Workbook, coverage: RouteCoverage, generatedAt: Date): void {
  const sheet = workbook.addWorksheet('Resumen', {
    properties: { tabColor: { argb: argb(PRIMARY) } },
    pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 1 },
  })
  sheet.columns = [{ width: 3 }, { width: 30 }, { width: 18 }, { width: 14 }]

  sheet.mergeCells('A1:D2')
  const band = sheet.getCell('A1')
  band.value = `  Cobertura de ruta · ${REPORT_TITLE}`
  band.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(PRIMARY) } }
  band.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } }
  band.alignment = { vertical: 'middle', horizontal: 'left' }

  sheet.getCell('B4').value = `Ruta ${routeLabel(coverage)}`
  sheet.getCell('B4').font = { bold: true, size: 12 }
  sheet.getCell('B5').value = `Generado ${generatedAt.toLocaleString('es-NI')} por ${REPORT_AUTHOR}`
  sheet.getCell('B5').font = { size: 10, color: { argb: 'FF5A6B83' } }

  const kpis: Array<[string, number | string, string]> = [
    ['Cuentas de la ruta', coverage.cuentasRuta, lightTint(PRIMARY)],
    ['Trabajadas', coverage.trabajadas, lightTint(ESTADO_COLORS.trabajada)],
    ['Pendientes', coverage.pendientes, lightTint(ESTADO_COLORS.pendiente)],
    ['Fuera de ruta', coverage.fueraDeRuta, lightTint(ESTADO_COLORS.fuera_de_ruta)],
    ['Avance', `${coverage.avancePct.toFixed(1)} %`, lightTint(PRIMARY)],
  ]
  let row = 7
  styleHeader(sheet.getRow(row), 3, PRIMARY)
  sheet.getRow(row).getCell(2).value = 'Indicador'
  sheet.getRow(row).getCell(3).value = 'Valor'
  for (const [label, value, fill] of kpis) {
    row += 1
    sheet.getCell(`B${row}`).value = label
    sheet.getCell(`C${row}`).value = value
    sheet.getCell(`C${row}`).alignment = { horizontal: 'right' }
    for (const column of ['B', 'C']) {
      sheet.getCell(`${column}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } }
      sheet.getCell(`${column}${row}`).border = BORDER
    }
  }

  row += 2
  sheet.getCell(`B${row}`).value = 'Trabajadas por usuario'
  sheet.getCell(`B${row}`).font = { bold: true, size: 11, color: { argb: argb(PRIMARY) } }
  row += 1
  styleHeader(sheet.getRow(row), 3, PRIMARY)
  sheet.getRow(row).getCell(2).value = 'Usuario'
  sheet.getRow(row).getCell(3).value = 'Cuentas'
  for (const user of workedPerUser(coverage.cuentas)) {
    row += 1
    sheet.getCell(`B${row}`).value = user.usuario
    sheet.getCell(`C${row}`).value = user.trabajadas
    sheet.getCell(`B${row}`).border = BORDER
    sheet.getCell(`C${row}`).border = BORDER
  }

  setupPrint(sheet, `Cobertura de ruta · ${routeLabel(coverage)}`)
}

/** Resumen, Pendientes and Trabajadas: the three sheets of the coverage report. */
export function buildCoverageWorkbook(coverage: RouteCoverage, generatedAt: Date): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = REPORT_AUTHOR
  workbook.lastModifiedBy = REPORT_AUTHOR
  workbook.title = `Cobertura de ruta ${routeLabel(coverage)}`
  workbook.created = generatedAt
  workbook.modified = generatedAt
  workbook.company = 'ENACAL'

  const title = `Cobertura de ruta · ${routeLabel(coverage)}`
  const pending = coverage.cuentas.filter((account) => account.estado === 'pendiente')
  const worked = coverage.cuentas.filter((account) => account.estado === 'trabajada')

  buildSummarySheet(workbook, coverage, generatedAt)
  listSheet(
    workbook,
    ESTADO_LABELS.pendiente,
    title,
    ['Cuenta', 'Cliente', 'Dirección'],
    [14, 36, 40],
    pending.map(accountRow),
    ESTADO_COLORS.pendiente,
  )
  listSheet(
    workbook,
    ESTADO_LABELS.trabajada,
    title,
    ['Cuenta', 'Cliente', 'Dirección', 'Usuario', 'Primera actividad', 'Última actividad', 'Fotos', 'Ubicaciones'],
    [14, 32, 36, 16, 18, 18, 10, 13],
    worked.map(workedRow),
    ESTADO_COLORS.trabajada,
  )

  return workbook
}
