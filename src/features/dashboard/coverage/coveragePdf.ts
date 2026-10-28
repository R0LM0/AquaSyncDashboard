import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { CHANGE_TYPE_COLORS } from '@/domain/labels'
import type { RouteCoverage } from '@/domain/types'
import { formatPercent } from '@/shared/format'
import { REPORT_AUTHOR, REPORT_TITLE, formatReportDateTime } from '../report/reportContent'
import {
  ESTADO_COLORS,
  ESTADO_LABELS,
  routeLabel,
  workedPerUser,
  type CoverageUserPoint,
} from './coverageAggregates'

const PAGE_WIDTH = 297
const MARGIN = 12
const USER_BARS = 8
const PRIMARY = CHANGE_TYPE_COLORS.FotoNueva

type Rgb = [number, number, number]

export function rgb(hex: string): Rgb {
  const value = hex.replace('#', '')
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ]
}

export function tint(hex: string, amount = 0.85): Rgb {
  const [r, g, b] = rgb(hex)
  return [Math.round(r + (255 - r) * amount), Math.round(g + (255 - g) * amount), Math.round(b + (255 - b) * amount)]
}

/** The KPI cards: one per figure, the color is the estado's own. */
function kpiCards(coverage: RouteCoverage): Array<{ label: string; value: string; color: string }> {
  const cards = [
    { label: 'Cuentas de la ruta', value: String(coverage.cuentasRuta), color: PRIMARY },
    { label: ESTADO_LABELS.trabajada, value: String(coverage.trabajadas), color: ESTADO_COLORS.trabajada },
    { label: ESTADO_LABELS.pendiente, value: String(coverage.pendientes), color: ESTADO_COLORS.pendiente },
    { label: 'Avance', value: formatPercent(coverage.avancePct), color: PRIMARY },
  ]
  if (coverage.fueraDeRuta > 0) {
    cards.push({ label: ESTADO_LABELS.fuera_de_ruta, value: String(coverage.fueraDeRuta), color: ESTADO_COLORS.fuera_de_ruta })
  }
  return cards
}

/** Trabajadas, fuera de ruta and pendientes as one proportional bar. */
function drawAvanceBar(doc: jsPDF, coverage: RouteCoverage, top: number): void {
  // Same base as the KPIs: the route roster, plus the off-route accounts drawn after it.
  const total = coverage.cuentasRuta + coverage.fueraDeRuta
  const width = PAGE_WIDTH - MARGIN * 2
  if (total === 0) return

  const segments: Array<{ count: number; color: string }> = [
    { count: coverage.trabajadas, color: ESTADO_COLORS.trabajada },
    { count: coverage.fueraDeRuta, color: ESTADO_COLORS.fuera_de_ruta },
    { count: coverage.pendientes, color: ESTADO_COLORS.pendiente },
  ]
  let x = MARGIN
  for (const segment of segments) {
    if (segment.count === 0) continue
    const segmentWidth = (segment.count / total) * width
    doc.setFillColor(...rgb(segment.color))
    doc.rect(x, top, segmentWidth, 6, 'F')
    x += segmentWidth
  }

  doc.setTextColor(90, 107, 131)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(`${coverage.trabajadas} trabajadas de ${coverage.cuentasRuta} cuentas de la ruta`, MARGIN, top + 11)
}

/** Worked accounts per user as horizontal bars, the same ranking the dashboard shows. */
function drawUserBars(doc: jsPDF, users: CoverageUserPoint[], top: number): number {
  doc.setTextColor(...rgb(PRIMARY))
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('TRABAJADAS POR USUARIO', MARGIN, top)

  const shown = users.slice(0, USER_BARS)
  const max = Math.max(...shown.map((user) => user.trabajadas), 1)
  const labelWidth = 40
  const barMax = 150

  shown.forEach((user, index) => {
    const y = top + 5 + index * 6
    doc.setTextColor(17, 26, 43)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(user.usuario.slice(0, 24), MARGIN, y + 3.5)

    const barWidth = (user.trabajadas / max) * barMax
    doc.setFillColor(...rgb(ESTADO_COLORS.trabajada))
    doc.rect(MARGIN + labelWidth, y, Math.max(barWidth, 0.5), 4.5, 'F')
    doc.text(String(user.trabajadas), MARGIN + labelWidth + barWidth + 2, y + 3.5)
  })

  return top + 5 + shown.length * 6
}

/**
 * The coverage report: a cover band, KPI cards, the avance bar, the users ranking and the
 * list of pending accounts. Charts are drawn as vectors, so the PDF needs no chart snapshots.
 */
export function buildCoveragePdf(coverage: RouteCoverage, generatedAt: Date): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  doc.setProperties({
    title: `Cobertura de ruta ${routeLabel(coverage)}`,
    subject: routeLabel(coverage),
    author: REPORT_AUTHOR,
    creator: REPORT_AUTHOR,
    keywords: 'SIGIL, catastro, AquaSync, ENACAL, cobertura',
  })

  // Cover band
  doc.setFillColor(...rgb(PRIMARY))
  doc.rect(0, 0, PAGE_WIDTH, 26, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Cobertura de ruta', MARGIN, 15)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`${REPORT_TITLE} · Ruta ${routeLabel(coverage)}`, PAGE_WIDTH - MARGIN, 12, { align: 'right' })
  doc.text(`Generado ${formatReportDateTime(generatedAt)}`, PAGE_WIDTH - MARGIN, 18, { align: 'right' })

  // KPI cards
  const cards = kpiCards(coverage)
  const cardTop = 34
  const cardWidth = (PAGE_WIDTH - MARGIN * 2 - (cards.length - 1) * 4) / cards.length
  cards.forEach((card, index) => {
    const x = MARGIN + index * (cardWidth + 4)
    doc.setFillColor(...tint(card.color))
    doc.setDrawColor(...tint(card.color, 0.6))
    doc.roundedRect(x, cardTop, cardWidth, 24, 2, 2, 'FD')

    doc.setTextColor(90, 107, 131)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.text(card.label.toUpperCase(), x + 3, cardTop + 6)

    doc.setTextColor(...rgb(card.color))
    doc.setFontSize(15)
    doc.text(card.value, x + 3, cardTop + 17)
  })

  // Avance bar and users ranking
  drawAvanceBar(doc, coverage, 66)
  const usersEnd = drawUserBars(doc, workedPerUser(coverage.cuentas), 82)

  // Pending accounts
  const pending = coverage.cuentas.filter((account) => account.estado === 'pendiente')
  doc.setTextColor(...rgb(ESTADO_COLORS.pendiente))
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(`CUENTAS PENDIENTES (${pending.length})`, MARGIN, usersEnd + 8)

  autoTable(doc, {
    startY: usersEnd + 11,
    head: [['Cuenta', 'N° catastral', 'Cliente', 'Dirección']],
    body: pending.map((account) => [
      account.cuenta,
      account.numeroCatastral || '—',
      account.cliente || '—',
      account.direccion || '—',
    ]),
    margin: { left: MARGIN, right: MARGIN, bottom: 14 },
    styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 1.6, textColor: [17, 26, 43], lineColor: [226, 232, 240], lineWidth: 0.1 },
    headStyles: { fillColor: rgb(ESTADO_COLORS.pendiente), textColor: [255, 255, 255], fontStyle: 'bold' },
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
