import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { CHANGE_TYPE_COLORS } from '@/domain/labels'
import { formatNumber } from '@/shared/format'
import { REPORT_AUTHOR, REPORT_TITLE, formatReportDateTime } from '../report/reportContent'
import { rgb, tint } from '../coverage/coveragePdf'
import { TRAFFIC_COLORS, TRAFFIC_LABELS } from '../coverage/ranking/routeRanking'
import { assignmentLight, assignmentTotals } from './activity'
import type { BarridoReport } from './barridoExcel'

const PAGE_WIDTH = 297
const MARGIN = 12
const PRIMARY = CHANGE_TYPE_COLORS.FotoNueva

const TABLE_STYLES = {
  font: 'helvetica',
  fontSize: 7.5,
  cellPadding: 1.6,
  textColor: [17, 26, 43] as [number, number, number],
  lineColor: [226, 232, 240] as [number, number, number],
  lineWidth: 0.1,
}

export function drawReportBand(doc: jsPDF, title: string, subtitle: string, generatedAt: Date): void {
  doc.setFillColor(...rgb(PRIMARY))
  doc.rect(0, 0, PAGE_WIDTH, 26, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(title, MARGIN, 15)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`${REPORT_TITLE}${subtitle ? ` · ${subtitle}` : ''}`, PAGE_WIDTH - MARGIN, 12, { align: 'right' })
  doc.text(`Generado ${formatReportDateTime(generatedAt)}`, PAGE_WIDTH - MARGIN, 18, { align: 'right' })
}

export function drawKpiCards(doc: jsPDF, cards: Array<{ label: string; value: string; color: string }>, top: number): void {
  const width = (PAGE_WIDTH - MARGIN * 2 - (cards.length - 1) * 4) / cards.length
  cards.forEach((card, index) => {
    const x = MARGIN + index * (width + 4)
    doc.setFillColor(...tint(card.color))
    doc.setDrawColor(...tint(card.color, 0.6))
    doc.roundedRect(x, top, width, 22, 2, 2, 'FD')
    doc.setTextColor(90, 107, 131)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.text(card.label.toUpperCase(), x + 3, top + 6)
    doc.setTextColor(...rgb(card.color))
    doc.setFontSize(15)
    doc.text(card.value, x + 3, top + 16)
  })
}

export function drawTable(doc: jsPDF, startY: number, head: string[], body: string[][]): void {
  autoTable(doc, {
    startY,
    head: [head],
    body,
    margin: { left: MARGIN, right: MARGIN, bottom: 14 },
    styles: TABLE_STYLES,
    headStyles: { fillColor: rgb(PRIMARY), textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [247, 249, 252] },
    showHead: 'everyPage',
  })
}

export function lastTableBottom(doc: jsPDF): number {
  return (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 60
}

export function drawFooters(doc: jsPDF): void {
  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page)
    doc.setFontSize(7)
    doc.setTextColor(90, 107, 131)
    doc.text(`${REPORT_AUTHOR} · Página ${page} de ${pages}`, MARGIN, 205)
  }
}

/** KPI cards, the assignments with their progress and the devices that surveyed. */
export function buildBarridoPdf(report: BarridoReport, generatedAt: Date): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const totals = assignmentTotals(report.asignaciones)
  const { resumen } = report.actividad

  doc.setProperties({
    title: 'Barrido',
    author: REPORT_AUTHOR,
    creator: REPORT_AUTHOR,
    keywords: 'SIGIL, catastro, AquaSync, ENACAL, barrido, encuestas',
  })

  drawReportBand(
    doc,
    'Avance del barrido',
    report.seleccion ? `${report.seleccion.usuario} · Ruta ${report.seleccion.ruta}` : 'Todas las asignaciones',
    generatedAt,
  )
  drawKpiCards(
    doc,
    [
      { label: 'Asignadas', value: formatNumber(totals.asignadas), color: PRIMARY },
      { label: 'Encuestadas', value: formatNumber(totals.encuestadas), color: TRAFFIC_COLORS.verde },
      { label: 'Pendientes', value: formatNumber(totals.pendientes), color: TRAFFIC_COLORS.rojo },
      { label: 'Avance', value: `${totals.avance.toFixed(1)} %`, color: PRIMARY },
      { label: 'Encuestas del período', value: formatNumber(resumen.encuestas), color: PRIMARY },
      { label: 'Hoy', value: formatNumber(resumen.hoy), color: PRIMARY },
      { label: 'Dispositivos', value: formatNumber(resumen.dispositivos), color: PRIMARY },
    ],
    34,
  )

  drawTable(
    doc,
    62,
    ['Usuario', 'Filial / Zona / Ruta', 'Período', 'Asignadas', 'Encuestadas', 'Pendientes', 'Avance', 'Semáforo'],
    report.asignaciones.map((row) => [
      row.usuario,
      `${row.filial} / ${row.zona} / ${row.ruta}`,
      row.periodo,
      formatNumber(row.asignadas),
      formatNumber(row.encuestadas),
      formatNumber(row.pendientes),
      `${row.avance.toFixed(1)} %`,
      TRAFFIC_LABELS[assignmentLight(row)],
    ]),
  )

  drawTable(
    doc,
    lastTableBottom(doc) + 10,
    ['Usuario', 'Alias', 'Modelo', 'Versión', 'Encuestas', 'Primera', 'Última'],
    report.actividad.dispositivos.map((device) => [
      device.usuario,
      device.alias,
      device.modelo || '—',
      device.appVersion || '—',
      formatNumber(device.cantidad),
      device.primera ? formatReportDateTime(new Date(device.primera)) : '—',
      device.ultima ? formatReportDateTime(new Date(device.ultima)) : '—',
    ]),
  )

  drawFooters(doc)
  return doc
}
