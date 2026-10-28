import { CHANGE_TYPE_LABELS } from '@/domain/labels'
import { formatNumber } from '@/shared/format'
import { formatReportDateTime, REPORT_LAYOUT, type ReportContent } from './reportContent'

export interface PdfTableSpec {
  title: string
  head: string[]
  body: string[][]
  /** Accent colour per row (the change type colour), applied to `accentColumn`. */
  rowColors?: Array<string | null>
  accentColumn?: number
  /** Right-aligned numeric columns. */
  numericColumns?: number[]
}

export interface PdfCoverSpec {
  title: string
  subtitle: string
  period: string
  environment: string
  filters: Array<{ label: string; value: string }>
  kpis: Array<{ label: string; value: string; color: string }>
  footer: string
}

export interface PdfReportSections {
  cover: PdfCoverSpec
  tables: PdfTableSpec[]
}

export function buildRoutesTable(content: ReportContent): PdfTableSpec {
  return {
    title: 'Avance por ruta',
    head: [...REPORT_LAYOUT.routeHeaders],
    body: content.routes.map((route) => [
      route.usuario,
      route.filial || '—',
      route.zona || '—',
      route.ruta || '—',
      formatNumber(route.cuentasRuta),
      formatNumber(route.cuentasTrabajadas),
      formatNumber(route.fotos),
      formatNumber(route.ubicaciones),
      `${Math.round(route.avance * 100)} %`,
      route.ultimaActividad ? formatReportDateTime(route.ultimaActividad) : '—',
    ]),
    numericColumns: [4, 5, 6, 7, 8],
  }
}

export function buildChangesTable(content: ReportContent): PdfTableSpec {
  return {
    title: 'Detalle de cambios',
    head: [...REPORT_LAYOUT.changeHeaders],
    body: content.changes.map((change) => [
      formatReportDateTime(change.fecha),
      change.usuario,
      change.cuenta,
      change.cliente || '—',
      change.filial || '—',
      change.zona || '—',
      change.ruta || '—',
      change.tipoLabel,
      change.origen || '—',
    ]),
    rowColors: content.changes.map((change) => change.tipoColor),
    accentColumn: 7,
  }
}

/** Everything the PDF prints, as plain data: jsPDF only paints it. */
export function buildPdfSections(content: ReportContent): PdfReportSections {
  return {
    cover: {
      title: content.meta.title,
      subtitle: `${content.meta.fileBase} · ${content.meta.environment}`,
      // `period.label` is already the local, human-readable range.
      period: `Período: ${content.period.label}`,
      environment: content.meta.environment,
      filters: content.filters,
      kpis: content.kpis.map((kpi) => ({ label: kpi.label, value: kpi.value, color: kpi.color })),
      footer: `Generado por ${content.meta.usuario} · ${formatReportDateTime(
        content.meta.generatedAt,
      )}`,
    },
    tables: [buildRoutesTable(content), buildChangesTable(content)],
  }
}

/** Order of the four change types, so charts and tables always agree. */
export const PDF_TYPE_ORDER = (Object.keys(CHANGE_TYPE_LABELS) as Array<
  keyof typeof CHANGE_TYPE_LABELS
>).map((tipo) => CHANGE_TYPE_LABELS[tipo])
