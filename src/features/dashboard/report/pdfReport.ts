import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { CHANGE_TYPE_COLORS } from '@/domain/labels'
import { buildPdfSections, type PdfTableSpec } from './pdfSections'
import { REPORT_AUTHOR, type ReportContent } from './reportContent'

const PRIMARY = CHANGE_TYPE_COLORS.FotoNueva
const PAGE_WIDTH = 297
const PAGE_HEIGHT = 210
const MARGIN = 12

export interface PdfCharts {
  daily?: string
  donut?: string
  routes?: string
  logo?: string
}

export function pdfFileName(content: ReportContent): string {
  return `${content.meta.fileBase}.pdf`
}

function rgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '')
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ]
}

function tint(hex: string, amount = 0.85): [number, number, number] {
  const [r, g, b] = rgb(hex)
  return [
    Math.round(r + (255 - r) * amount),
    Math.round(g + (255 - g) * amount),
    Math.round(b + (255 - b) * amount),
  ]
}

const primary = rgb(PRIMARY)

export function buildPdfDocument(content: ReportContent, charts: PdfCharts = {}): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const sections = buildPdfSections(content)

  doc.setProperties({
    title: content.meta.title,
    subject: content.meta.fileBase,
    author: REPORT_AUTHOR,
    creator: REPORT_AUTHOR,
    keywords: 'SIGIL, catastro, AquaSync, ENACAL',
  })

  // ---------------------------------------------------------------- cover
  doc.setFillColor(...primary)
  doc.rect(0, 0, PAGE_WIDTH, 26, 'F')

  if (charts.logo) {
    try {
      doc.addImage(charts.logo, 'PNG', MARGIN, 5, 16, 16)
    } catch {
      /* the band still carries the title */
    }
  }

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(sections.cover.title, MARGIN + 20, 15)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(sections.cover.subtitle, PAGE_WIDTH - MARGIN, 12, { align: 'right' })
  doc.text(sections.cover.period, PAGE_WIDTH - MARGIN, 18, { align: 'right' })

  // Filters box
  const filtersTop = 34
  doc.setDrawColor(214, 221, 232)
  doc.setFillColor(247, 249, 252)
  doc.roundedRect(MARGIN, filtersTop, PAGE_WIDTH - MARGIN * 2, 26, 2, 2, 'FD')
  doc.setTextColor(...primary)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('FILTROS APLICADOS', MARGIN + 4, filtersTop + 6)

  doc.setFontSize(8)
  sections.cover.filters.forEach((filter, index) => {
    const column = index % 4
    const row = Math.floor(index / 4)
    const x = MARGIN + 4 + column * 68
    const y = filtersTop + 13 + row * 7

    doc.setTextColor(90, 107, 131)
    doc.setFont('helvetica', 'bold')
    doc.text(`${filter.label}:`, x, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(17, 26, 43)
    doc.text(filter.value.slice(0, 34), x + 26, y)
  })

  // KPI cards
  const cardTop = 66
  const cardWidth = (PAGE_WIDTH - MARGIN * 2 - 5 * 4) / 6
  sections.cover.kpis.forEach((kpi, index) => {
    const x = MARGIN + index * (cardWidth + 4)
    doc.setFillColor(...tint(kpi.color))
    doc.setDrawColor(...tint(kpi.color, 0.6))
    doc.roundedRect(x, cardTop, cardWidth, 24, 2, 2, 'FD')

    doc.setTextColor(90, 107, 131)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.text(kpi.label.toUpperCase(), x + 3, cardTop + 6)

    doc.setTextColor(...rgb(kpi.color))
    doc.setFontSize(15)
    doc.text(kpi.value, x + 3, cardTop + 17)
  })

  // Chart snapshots on a light background, always readable in the dark theme
  const chartsTop = 96
  const chartHeight = 62
  const slots: Array<{ image?: string; title: string; width: number }> = [
    { image: charts.daily, title: 'Actividad diaria', width: 150 },
    { image: charts.donut, title: 'Distribución por tipo', width: 100 },
    { image: charts.routes, title: 'Avance por ruta', width: 150 },
  ]

  let cursorX = MARGIN
  for (const slot of slots) {
    if (slot.image) {
      doc.setFillColor(255, 255, 255)
      doc.setDrawColor(232, 237, 245)
      doc.roundedRect(cursorX, chartsTop, slot.width, chartHeight + 8, 2, 2, 'FD')
      doc.setTextColor(90, 107, 131)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.text(slot.title.toUpperCase(), cursorX + 3, chartsTop + 5)
      try {
        doc.addImage(slot.image, 'PNG', cursorX + 2, chartsTop + 7, slot.width - 4, chartHeight - 2)
      } catch {
        /* keep the frame: a missing snapshot must not break the report */
      }
    }
    cursorX += slot.width + 6
  }

  // ----------------------------------------------------------------- tables
  for (const table of sections.tables) {
    doc.addPage()
    drawTable(doc, table)
  }

  // ---------------------------------------------------------------- footers
  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page)
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.2)
    doc.line(MARGIN, PAGE_HEIGHT - 12, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 12)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(90, 107, 131)
    doc.text(`Página ${page} de ${pages}`, MARGIN, PAGE_HEIGHT - 7)
    doc.text(sections.cover.footer, PAGE_WIDTH / 2, PAGE_HEIGHT - 7, { align: 'center' })
    doc.text(sections.cover.environment, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 7, { align: 'right' })
  }

  return doc
}

function drawTable(doc: jsPDF, table: PdfTableSpec): void {
  doc.setFillColor(...primary)
  doc.rect(0, 0, PAGE_WIDTH, 16, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(table.title, MARGIN, 10)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`${table.body.length} filas`, PAGE_WIDTH - MARGIN, 10, { align: 'right' })

  const columnStyles: Record<number, { halign?: 'right'; cellWidth?: number }> = {}
  for (const column of table.numericColumns ?? []) columnStyles[column] = { halign: 'right' }

  autoTable(doc, {
    startY: 22,
    head: [table.head],
    body: table.body,
    margin: { left: MARGIN, right: MARGIN, bottom: 18 },
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 1.8,
      textColor: [17, 26, 43],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: primary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: [247, 249, 252] },
    columnStyles,
    showHead: 'everyPage',
    didParseCell: (data) => {
      if (data.section !== 'body') return
      if (table.accentColumn === undefined) return
      if (data.column.index !== table.accentColumn) return

      const color = table.rowColors?.[data.row.index]
      if (!color) return
      data.cell.styles.textColor = rgb(color)
      data.cell.styles.fontStyle = 'bold'
      data.cell.styles.fillColor = tint(color, 0.82)
    },
  })
}
