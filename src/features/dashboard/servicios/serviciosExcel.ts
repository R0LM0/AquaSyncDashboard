import ExcelJS from 'exceljs'
import type { ServiciosNuevos } from '@/domain/types'
import { PRIMARY, listSheet, type Cell } from '../coverage/coverageExcel'
import { REPORT_AUTHOR, REPORT_TITLE } from '../report/reportContent'
import { DAY_HEADERS, DAY_WIDTHS, deviceHeaders, DEVICE_WIDTHS, dayCells, deviceCells } from '../barrido/activityExport'

const TITLE = 'Servicios nuevos'

export const RECORD_HEADERS = ['Fecha', 'Usuario', 'Alias', 'Modelo', 'Estado', 'Sucursal', 'Cliente', 'Lat', 'Lng']

/** Resumen (with the count per estado), Registros, Dispositivos and Por día. */
export function buildServiciosWorkbook(data: ServiciosNuevos, generatedAt: Date): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = REPORT_AUTHOR
  workbook.lastModifiedBy = REPORT_AUTHOR
  workbook.title = `${TITLE} · ${REPORT_TITLE}`
  workbook.created = generatedAt
  workbook.modified = generatedAt
  workbook.company = 'ENACAL'

  const summary: Cell[][] = [
    ['Registrados', data.resumen.registrados],
    ['Hoy', data.resumen.hoy],
    ...data.resumen.porEstado.map((row): Cell[] => [`Estado: ${row.estado}`, row.cantidad]),
  ]
  listSheet(workbook, 'Resumen', TITLE, ['Indicador', 'Valor'], [30, 14], summary, PRIMARY)

  listSheet(
    workbook,
    'Registros',
    TITLE,
    RECORD_HEADERS,
    [18, 18, 16, 20, 14, 22, 28, 11, 11],
    data.registros.map((row) => [
      new Date(row.fecha), row.usuario, row.alias, row.modelo, row.estado, row.sucursal, row.cliente, row.lat, row.lng,
    ]),
    PRIMARY,
  )
  listSheet(workbook, 'Dispositivos', TITLE, deviceHeaders('Registros'), DEVICE_WIDTHS, deviceCells(data.dispositivos), PRIMARY)
  listSheet(workbook, 'Por día', TITLE, DAY_HEADERS, DAY_WIDTHS, dayCells(data.porDia), PRIMARY)

  return workbook
}
