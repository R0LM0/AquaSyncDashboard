import ExcelJS from 'exceljs'
import type { RouteRankingRow } from '@/domain/types'
import { PRIMARY, listSheet, type Cell } from '../coverageExcel'
import { REPORT_AUTHOR, REPORT_TITLE } from '../../report/reportContent'
import { TRAFFIC_LABELS, rankingKpis, trafficLight } from './routeRanking'

const TITLE = 'Cobertura de rutas'

/** Resumen (the KPIs) and Rutas (every route, worst first, with its traffic light). */
export function buildRankingWorkbook(rows: RouteRankingRow[], generatedAt: Date): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = REPORT_AUTHOR
  workbook.lastModifiedBy = REPORT_AUTHOR
  workbook.title = `${TITLE} · ${REPORT_TITLE}`
  workbook.created = generatedAt
  workbook.modified = generatedAt
  workbook.company = 'ENACAL'

  const kpis = rankingKpis(rows)
  const summary: Cell[][] = [
    ['Rutas', kpis.rutas],
    ['Completas (90 % o más)', kpis.completas],
    ['En curso', kpis.enCurso],
    ['Sin iniciar', kpis.sinIniciar],
    ['Pendientes totales', kpis.pendientes],
  ]
  listSheet(workbook, 'Resumen', TITLE, ['Indicador', 'Valor'], [34, 16], summary, PRIMARY)

  const routes: Cell[][] = rows.map((row) => [
    row.filial,
    row.zona,
    row.ruta,
    TRAFFIC_LABELS[trafficLight(row)],
    row.cuentasRuta,
    row.trabajadas,
    row.pendientes,
    row.avancePct,
    row.usuarios,
    row.ultimaActividad ? new Date(row.ultimaActividad) : null,
  ])
  listSheet(
    workbook,
    'Rutas',
    TITLE,
    ['Filial', 'Zona', 'Ruta', 'Semáforo', 'Cuentas ruta', 'Trabajadas', 'Pendientes', 'Avance (%)', 'Usuarios', 'Última actividad'],
    [10, 10, 14, 16, 13, 13, 13, 12, 11, 18],
    routes,
    PRIMARY,
  )

  return workbook
}
