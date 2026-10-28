import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { CHANGE_TYPE_COLORS } from '@/domain/labels'
import type { RouteRankingRow } from '@/domain/types'
import { formatNumber } from '@/shared/format'
import { REPORT_AUTHOR, REPORT_TITLE, formatReportDateTime } from '../../report/reportContent'
import { rgb, tint } from '../coveragePdf'
import { TRAFFIC_COLORS, TRAFFIC_LABELS, rankingKpis, routeName, trafficLight } from './routeRanking'

const PAGE_WIDTH = 297
const MARGIN = 12
const PRIMARY = CHANGE_TYPE_COLORS.FotoNueva

/** The ranking as a landscape report: KPI cards, then every route worst first with its traffic light. */
export function buildRankingPdf(rows: RouteRankingRow[], generatedAt: Date): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const kpis = rankingKpis(rows)

  doc.setProperties({
    title: 'Cobertura de rutas',
    author: REPORT_AUTHOR,
    creator: REPORT_AUTHOR,
    keywords: 'SIGIL, catastro, AquaSync, ENACAL, cobertura, rutas',
  })

  doc.setFillColor(...rgb(PRIMARY))
  doc.rect(0, 0, PAGE_WIDTH, 26, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Cobertura de rutas', MARGIN, 15)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(REPORT_TITLE, PAGE_WIDTH - MARGIN, 12, { align: 'right' })
  doc.text(`Generado ${formatReportDateTime(generatedAt)}`, PAGE_WIDTH - MARGIN, 18, { align: 'right' })

  const cards = [
    { label: 'Rutas', value: formatNumber(kpis.rutas), color: PRIMARY },
    { label: 'Completas (90 % o más)', value: formatNumber(kpis.completas), color: TRAFFIC_COLORS.verde },
    { label: 'En curso', value: formatNumber(kpis.enCurso), color: TRAFFIC_COLORS.amarillo },
    { label: 'Sin iniciar', value: formatNumber(kpis.sinIniciar), color: TRAFFIC_COLORS.gris },
    { label: 'Pendientes totales', value: formatNumber(kpis.pendientes), color: TRAFFIC_COLORS.rojo },
  ]
  const cardTop = 34
  const cardWidth = (PAGE_WIDTH - MARGIN * 2 - (cards.length - 1) * 4) / cards.length
  cards.forEach((card, index) => {
    const x = MARGIN + index * (cardWidth + 4)
    doc.setFillColor(...tint(card.color))
    doc.setDrawColor(...tint(card.color, 0.6))
    doc.roundedRect(x, cardTop, cardWidth, 22, 2, 2, 'FD')
    doc.setTextColor(90, 107, 131)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.text(card.label.toUpperCase(), x + 3, cardTop + 6)
    doc.setTextColor(...rgb(card.color))
    doc.setFontSize(15)
    doc.text(card.value, x + 3, cardTop + 16)
  })

  autoTable(doc, {
    startY: 62,
    head: [['Ruta', 'Semáforo', 'Cuentas ruta', 'Trabajadas', 'Pendientes', 'Avance', 'Usuarios', 'Última actividad']],
    body: rows.map((row) => [
      routeName(row),
      TRAFFIC_LABELS[trafficLight(row)],
      formatNumber(row.cuentasRuta),
      formatNumber(row.trabajadas),
      formatNumber(row.pendientes),
      `${row.avancePct.toFixed(1)} %`,
      formatNumber(row.usuarios),
      row.ultimaActividad ? formatReportDateTime(new Date(row.ultimaActividad)) : '—',
    ]),
    margin: { left: MARGIN, right: MARGIN, bottom: 14 },
    styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 1.6, textColor: [17, 26, 43], lineColor: [226, 232, 240], lineWidth: 0.1 },
    headStyles: { fillColor: rgb(PRIMARY), textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [247, 249, 252] },
    showHead: 'everyPage',
  })

  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page)
    doc.setFontSize(7)
    doc.setTextColor(90, 107, 131)
    doc.text(`AquaSync Catastro · Página ${page} de ${pages}`, MARGIN, 205)
  }

  return doc
}
