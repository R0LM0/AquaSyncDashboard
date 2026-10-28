import ExcelJS from 'exceljs'
import { CHANGE_TYPE_COLORS } from '@/domain/labels'
import {
  formatReportDateTime,
  REPORT_AUTHOR,
  REPORT_LAYOUT,
  REPORT_TITLE,
  type ReportContent,
} from './reportContent'

const PRIMARY = CHANGE_TYPE_COLORS.FotoNueva
const BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFD6DDE8' } },
  left: { style: 'thin', color: { argb: 'FFD6DDE8' } },
  bottom: { style: 'thin', color: { argb: 'FFD6DDE8' } },
  right: { style: 'thin', color: { argb: 'FFD6DDE8' } },
}

/** `#RRGGBB` → ExcelJS ARGB. */
export function argb(hex: string): string {
  return `FF${hex.replace('#', '').toUpperCase()}`
}

/** Light tint of a brand colour, for KPI fills. */
export function lightTint(hex: string, amount = 0.86): string {
  const value = hex.replace('#', '')
  const channels = [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16))
  const mixed = channels.map((channel) => Math.round(channel + (255 - channel) * amount))

  return `FF${mixed.map((channel) => channel.toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

export function excelFileName(content: ReportContent): string {
  return `${content.meta.fileBase}.xlsx`
}

export interface ExcelReportOptions {
  /** PNG data URL of the logo, rasterized from public/favicon.svg. */
  logoPng?: string
}

function styleHeaderRow(row: ExcelJS.Row, columns: number): void {
  for (let index = 1; index <= columns; index += 1) {
    const cell = row.getCell(index)
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(PRIMARY) } }
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = BORDER
  }
  row.height = 22
}

function setupPrint(worksheet: ExcelJS.Worksheet, title: string, environment: string): void {
  worksheet.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    horizontalCentered: true,
  }

  // ExcelJS keeps the print header/footer on the worksheet, not in pageSetup.
  worksheet.headerFooter = {
    oddHeader: `&L&"Calibri,Bold"${title}&R${environment}`,
    oddFooter: '&LAquaSync Catastro&CPágina &P de &N&R&F',
  }
}

export function buildExcelWorkbook(
  content: ReportContent,
  options: ExcelReportOptions = {},
): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = REPORT_AUTHOR
  workbook.lastModifiedBy = REPORT_AUTHOR
  workbook.title = content.meta.title
  workbook.subject = content.meta.fileBase
  workbook.created = content.meta.generatedAt
  workbook.modified = content.meta.generatedAt
  workbook.company = 'ENACAL'

  buildCover(workbook, content, options)
  buildRoutesSheet(workbook, content)
  buildChangesSheet(workbook, content)
  buildDailySheet(workbook, content)

  return workbook
}

function buildCover(
  workbook: ExcelJS.Workbook,
  content: ReportContent,
  options: ExcelReportOptions,
): void {
  const sheet = workbook.addWorksheet('Resumen', {
    properties: { tabColor: { argb: argb(PRIMARY) } },
    pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 1 },
  })

  sheet.columns = [
    { width: 3 },
    { width: 26 },
    { width: 22 },
    { width: 18 },
    { width: 16 },
    { width: 16 },
  ]

  // Header band
  sheet.mergeCells('A1:F3')
  const band = sheet.getCell('A1')
  band.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(PRIMARY) } }
  band.value = `  ${REPORT_TITLE}`
  band.font = { bold: true, size: 20, color: { argb: 'FFFFFFFF' } }
  band.alignment = { vertical: 'middle', horizontal: 'left' }
  sheet.getRow(1).height = 16
  sheet.getRow(2).height = 16
  sheet.getRow(3).height = 16

  if (options.logoPng) {
    const logoId = workbook.addImage({ base64: options.logoPng, extension: 'png' })
    sheet.addImage(logoId, { tl: { col: 5.1, row: 0.25 }, ext: { width: 44, height: 44 } })
  }

  let row = 5
  sheet.mergeCells(`B${row}:F${row}`)
  sheet.getCell(`B${row}`).value = content.meta.fileBase
  sheet.getCell(`B${row}`).font = { bold: true, size: 12 }
  row += 1
  sheet.getCell(`B${row}`).value = `Período: ${content.period.label}`
  sheet.getCell(`B${row}`).font = { size: 11, color: { argb: 'FF5A6B83' } }
  row += 2

  // Filters block
  sheet.getCell(`B${row}`).value = 'Filtros aplicados'
  sheet.getCell(`B${row}`).font = { bold: true, size: 11, color: { argb: argb(PRIMARY) } }
  row += 1

  for (const filter of content.filters) {
    const label = sheet.getCell(`B${row}`)
    label.value = filter.label
    label.font = { bold: true, size: 10, color: { argb: 'FF5A6B83' } }
    sheet.mergeCells(`C${row}:F${row}`)
    const value = sheet.getCell(`C${row}`)
    value.value = filter.value
    value.font = { size: 10 }
    row += 1
  }

  row += 1

  // KPI block
  sheet.getCell(`B${row}`).value = 'Resumen del período'
  sheet.getCell(`B${row}`).font = { bold: true, size: 11, color: { argb: argb(PRIMARY) } }
  row += 1

  for (const kpi of content.kpis) {
    const label = sheet.getCell(`B${row}`)
    label.value = kpi.label
    label.font = { size: 10 }
    label.border = BORDER

    const value = sheet.getCell(`C${row}`)
    value.value = kpi.raw ?? '—'
    if (kpi.raw !== null) value.numFmt = '0.0'
    value.font = { bold: true, size: 14, color: { argb: argb(kpi.color) } }
    value.alignment = { horizontal: 'right' }
    value.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightTint(kpi.color) } }
    value.border = BORDER
    row += 1
  }

  row += 1
  const footer = sheet.getCell(`B${row}`)
  footer.value = `Generado por ${content.meta.usuario} el ${formatReportDateTime(content.meta.generatedAt)}`
  footer.font = { size: 9, color: { argb: 'FF5A6B83' } }
  sheet.getCell(`B${row + 1}`).value = `Ambiente: ${content.meta.environment}`
  sheet.getCell(`B${row + 1}`).font = { size: 9, bold: true, color: { argb: 'FF5A6B83' } }
}

function buildRoutesSheet(workbook: ExcelJS.Workbook, content: ReportContent): void {
  const sheet = workbook.addWorksheet('Avance por ruta')
  sheet.columns = [
    { key: 'usuario', width: 16 },
    { key: 'filial', width: 10 },
    { key: 'zona', width: 10 },
    { key: 'ruta', width: 12 },
    { key: 'cuentasRuta', width: 13 },
    { key: 'cuentasTrabajadas', width: 13 },
    { key: 'fotos', width: 10 },
    { key: 'ubicaciones', width: 12 },
    { key: 'avance', width: 11 },
    { key: 'ultimaActividad', width: 19 },
  ]

  const header = sheet.addRow([...REPORT_LAYOUT.routeHeaders])
  styleHeaderRow(header, REPORT_LAYOUT.routeHeaders.length)

  for (const route of content.routes) {
    const row = sheet.addRow([
      route.usuario,
      route.filial,
      route.zona,
      route.ruta,
      route.cuentasRuta,
      route.cuentasTrabajadas,
      route.fotos,
      route.ubicaciones,
      route.avance,
      route.ultimaActividad,
    ])

    for (let index = 5; index <= 8; index += 1) row.getCell(index).numFmt = '#,##0'
    row.getCell(9).numFmt = '0%'
    row.getCell(9).font = { bold: true }
    row.getCell(10).numFmt = 'dd/mm/yyyy hh:mm'
    if (!route.ultimaActividad) row.getCell(10).value = '—'
    row.eachCell((cell) => {
      cell.border = BORDER
      cell.font = { ...cell.font, size: 10 }
    })
  }

  const firstDataRow = 2
  // Header + data rows; the totals row stays outside the filter range.
  const lastDataRow = Math.max(1, 1 + content.routes.length)

  const totals = sheet.addRow([
    'Totales',
    '',
    '',
    '',
    content.routeTotals.cuentasRuta,
    content.routeTotals.cuentasTrabajadas,
    content.routeTotals.fotos,
    content.routeTotals.ubicaciones,
    content.routeTotals.avance,
    '',
  ])
  totals.font = { bold: true, size: 10 }
  for (let index = 5; index <= 8; index += 1) totals.getCell(index).numFmt = '#,##0'
  totals.getCell(9).numFmt = '0%'
  totals.eachCell((cell) => {
    cell.border = BORDER
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2F7' } }
  })

  sheet.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }]
  // The filter must cover the data, not only the header row.
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: lastDataRow, column: 10 } }

  if (lastDataRow >= firstDataRow) {
    sheet.addConditionalFormatting({
      ref: `I${firstDataRow}:I${lastDataRow}`,
      rules: [
        {
          type: 'dataBar',
          minLength: 0,
          maxLength: 100,
          gradient: true,
          border: true,
          showValue: true,
          color: { argb: argb(PRIMARY) },
          cfvo: [{ type: 'num', value: 0 }, { type: 'num', value: 1 }],
        } as unknown as ExcelJS.ConditionalFormattingRule,
      ],
    })
  }

  setupPrint(sheet, 'Avance por ruta', content.meta.environment)
}

function buildChangesSheet(workbook: ExcelJS.Workbook, content: ReportContent): void {
  const sheet = workbook.addWorksheet('Detalle de cambios')
  sheet.columns = [
    { key: 'fecha', width: 18 },
    { key: 'usuario', width: 14 },
    { key: 'cuenta', width: 12 },
    { key: 'cliente', width: 30 },
    { key: 'filial', width: 9 },
    { key: 'zona', width: 9 },
    { key: 'ruta', width: 10 },
    { key: 'tipo', width: 20 },
    { key: 'origen', width: 12 },
  ]

  const header = sheet.addRow([...REPORT_LAYOUT.changeHeaders])
  styleHeaderRow(header, REPORT_LAYOUT.changeHeaders.length)

  content.changes.forEach((change, index) => {
    const row = sheet.addRow([
      change.fecha,
      change.usuario,
      change.cuenta,
      change.cliente,
      change.filial,
      change.zona,
      change.ruta,
      change.tipoLabel,
      change.origen,
    ])

    row.getCell(1).numFmt = 'dd/mm/yyyy hh:mm'
    row.getCell(1).alignment = { horizontal: 'left' }
    row.getCell(8).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: lightTint(change.tipoColor, 0.8) },
    }
    row.getCell(8).font = { bold: true, size: 10, color: { argb: argb(change.tipoColor) } }

    row.eachCell((cell, column) => {
      cell.border = BORDER
      if (column !== 8) cell.font = { ...cell.font, size: 10 }
      if (index % 2 === 1 && column !== 8) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F9FC' } }
      }
    })
  })

  sheet.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }]
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, sheet.rowCount), column: 9 },
  }
  setupPrint(sheet, 'Detalle de cambios', content.meta.environment)
}

function buildDailySheet(workbook: ExcelJS.Workbook, content: ReportContent): void {
  const sheet = workbook.addWorksheet('Actividad diaria')
  sheet.columns = REPORT_LAYOUT.dailyHeaders.map((label) => ({
    width: label === 'Fecha' ? 14 : 18,
  }))

  const header = sheet.addRow([...REPORT_LAYOUT.dailyHeaders])
  styleHeaderRow(header, REPORT_LAYOUT.dailyHeaders.length)

  for (const day of content.daily) {
    const row = sheet.addRow([
      day.fecha,
      day.FotoNueva,
      day.FotoActualizada,
      day.UbicacionNueva,
      day.UbicacionCorregida,
      day.total,
    ])
    row.getCell(1).numFmt = 'dd/mm/yyyy'
    row.eachCell((cell) => {
      cell.border = BORDER
      cell.font = { ...cell.font, size: 10 }
    })
    row.getCell(6).font = { bold: true, size: 10 }
  }

  sheet.views = [{ state: 'frozen', ySplit: 1 }]
  setupPrint(sheet, 'Actividad diaria', content.meta.environment)
}
