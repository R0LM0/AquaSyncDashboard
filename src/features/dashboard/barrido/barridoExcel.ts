import ExcelJS from 'exceljs'
import type { BarridoActividad, BarridoAsignacion, BarridoPendiente } from '@/domain/types'
import { PRIMARY, listSheet, type Cell } from '../coverage/coverageExcel'
import { REPORT_AUTHOR, REPORT_TITLE } from '../report/reportContent'
import { TRAFFIC_LABELS } from '../coverage/ranking/routeRanking'
import { assignmentLight, assignmentTotals, sortWorkedAccounts } from './activity'
import { DAY_HEADERS, DAY_WIDTHS, deviceHeaders, DEVICE_WIDTHS, dayCells, deviceCells } from './activityExport'

const TITLE = 'Barrido'

export const ASSIGNMENT_HEADERS = [
  'Usuario', 'Filial', 'Zona', 'Ruta', 'Período', 'Asignadas', 'Encuestadas', 'Pendientes', 'Avance (%)', 'Semáforo',
]
export const SURVEY_HEADERS = ['Cuenta', 'Catastro', 'Dispositivo', 'Fecha', 'Lat', 'Lng']
export const WORKED_HEADERS = ['Cuenta', 'N° catastral', 'Dispositivo', 'Fecha']
export const PENDING_HEADERS = ['Cuenta', 'Catastro', 'Cliente', 'Dirección', 'Lat', 'Lng']

export interface BarridoReport {
  asignaciones: BarridoAsignacion[]
  /** The assignment the activity is narrowed to, when one was picked. */
  seleccion: BarridoAsignacion | null
  actividad: BarridoActividad
  /** Only when the pending layer was loaded for the picked assignment. */
  pendientes: BarridoPendiente[] | null
}

/** Resumen, Asignaciones, Dispositivos, Por día, Encuestas, Cuentas trabajadas and (when loaded) Pendientes. */
export function buildBarridoWorkbook(report: BarridoReport, generatedAt: Date): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = REPORT_AUTHOR
  workbook.lastModifiedBy = REPORT_AUTHOR
  workbook.title = `${TITLE} · ${REPORT_TITLE}`
  workbook.created = generatedAt
  workbook.modified = generatedAt
  workbook.company = 'ENACAL'

  const totals = assignmentTotals(report.asignaciones)
  const summary: Cell[][] = [
    ['Alcance', report.seleccion ? `${report.seleccion.usuario} · ${report.seleccion.ruta} · ${report.seleccion.periodo}` : 'Todas las asignaciones'],
    ['Asignadas', totals.asignadas],
    ['Encuestadas', totals.encuestadas],
    ['Pendientes', totals.pendientes],
    ['Avance (%)', totals.avance],
    ['Encuestas del período', report.actividad.resumen.encuestas],
    ['Hoy', report.actividad.resumen.hoy],
    ['Dispositivos', report.actividad.resumen.dispositivos],
  ]
  listSheet(workbook, 'Resumen', TITLE, ['Indicador', 'Valor'], [30, 36], summary, PRIMARY)

  listSheet(
    workbook,
    'Asignaciones',
    TITLE,
    ASSIGNMENT_HEADERS,
    [18, 9, 9, 14, 18, 12, 13, 12, 12, 14],
    report.asignaciones.map((row) => [
      row.usuario, row.filial, row.zona, row.ruta, row.periodo, row.asignadas, row.encuestadas, row.pendientes, row.avance,
      TRAFFIC_LABELS[assignmentLight(row)],
    ]),
    PRIMARY,
  )
  listSheet(workbook, 'Dispositivos', TITLE, deviceHeaders('Encuestas'), DEVICE_WIDTHS, deviceCells(report.actividad.dispositivos), PRIMARY)
  listSheet(workbook, 'Por día', TITLE, DAY_HEADERS, DAY_WIDTHS, dayCells(report.actividad.porDia), PRIMARY)
  listSheet(
    workbook,
    'Encuestas',
    TITLE,
    SURVEY_HEADERS,
    [12, 22, 18, 18, 11, 11],
    report.actividad.puntos.map((point) => [Number(point.cuenta), point.catastro, point.alias, new Date(point.fecha), point.lat, point.lng]),
    PRIMARY,
  )

  listSheet(
    workbook,
    'Cuentas trabajadas',
    TITLE,
    WORKED_HEADERS,
    [12, 22, 18, 18],
    sortWorkedAccounts(report.actividad.puntos).map((point) => [Number(point.cuenta), point.catastro, point.alias, new Date(point.fecha)]),
    PRIMARY,
  )

  if (report.pendientes) {
    listSheet(
      workbook,
      'Pendientes',
      TITLE,
      PENDING_HEADERS,
      [12, 22, 30, 36, 11, 11],
      report.pendientes.map((row) => [Number(row.cuentaNro), row.catastro, row.cliente, row.direccion, row.lat, row.lng]),
      PRIMARY,
    )
  }

  return workbook
}
