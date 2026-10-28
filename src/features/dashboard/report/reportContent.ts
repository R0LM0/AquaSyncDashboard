import { CHANGE_TYPE_COLORS, CHANGE_TYPE_LABELS, CHANGE_TYPES } from '@/domain/labels'
import type {
  Catalogs,
  ChangeRow,
  ChangeType,
  DailyProgress,
  Filters,
  Summary,
  UserRouteProgress,
} from '@/domain/types'
import { parseDateKey } from '@/shared/dates'
import { formatNumber, formatPercent } from '@/shared/format'

/** Above this, the report warns instead of silently reading a huge detail. */
export const ROWS_WARNING_LIMIT = 20_000
export const REPORT_AUTHOR = 'AquaSync Catastro'
export const REPORT_TITLE = 'Seguimiento catastral'

export interface ReportMeta {
  title: string
  usuario: string
  generatedAt: Date
  /** PRUEBAS / PRODUCCIÓN / LOCAL, as shown by the environment chip. */
  environment: string
  /** "AquaSync Catastro – Reporte <desde> a <hasta>" */
  fileBase: string
}

export interface ReportFilterLine {
  label: string
  value: string
}

export interface ReportKpi {
  key: keyof Summary
  label: string
  /** Formatted value, what the PDF prints. */
  value: string
  /** Numeric value, what Excel stores (null when the API cannot compute it). */
  raw: number | null
  color: string
}

export interface ReportRouteRow {
  usuario: string
  filial: string
  zona: string
  ruta: string
  cuentasRuta: number
  cuentasTrabajadas: number
  fotos: number
  ubicaciones: number
  /** 0..1, so Excel can format it as a percentage. */
  avance: number
  ultimaActividad: Date | null
}

export interface ReportRouteTotals {
  cuentasRuta: number
  cuentasTrabajadas: number
  fotos: number
  ubicaciones: number
  avance: number
}

export interface ReportChangeRow {
  fecha: Date
  usuario: string
  cuenta: string
  cliente: string
  filial: string
  zona: string
  ruta: string
  tipo: ChangeType
  tipoLabel: string
  tipoColor: string
  origen: string
}

export interface ReportDailyRow {
  fecha: Date
  FotoNueva: number
  FotoActualizada: number
  UbicacionNueva: number
  UbicacionCorregida: number
  total: number
}

export interface ReportContent {
  meta: ReportMeta
  period: { desde: string; hasta: string; label: string }
  filters: ReportFilterLine[]
  kpis: ReportKpi[]
  routes: ReportRouteRow[]
  routeTotals: ReportRouteTotals
  changes: ReportChangeRow[]
  daily: ReportDailyRow[]
}

const KPI_CARDS: Array<{ key: keyof Summary; label: string; color: string; percent?: boolean }> = [
  { key: 'cuentasTrabajadas', label: 'Cuentas trabajadas', color: CHANGE_TYPE_COLORS.FotoNueva },
  { key: 'fotosNuevas', label: 'Fotos nuevas', color: CHANGE_TYPE_COLORS.FotoNueva },
  { key: 'fotosActualizadas', label: 'Fotos actualizadas', color: CHANGE_TYPE_COLORS.FotoActualizada },
  { key: 'ubicaciones', label: 'Ubicaciones', color: CHANGE_TYPE_COLORS.UbicacionNueva },
  { key: 'usuariosActivos', label: 'Usuarios activos', color: CHANGE_TYPE_COLORS.UbicacionCorregida },
  { key: 'avanceRutaPct', label: 'Avance de ruta', color: CHANGE_TYPE_COLORS.FotoActualizada, percent: true },
]

export function formatReportDate(date: Date): string {
  const day = `${date.getDate()}`.padStart(2, '0')
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  return `${day}/${month}/${date.getFullYear()}`
}

export function formatReportDateTime(date: Date): string {
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')
  return `${formatReportDate(date)} ${hours}:${minutes}`
}

/** `true` when the API reported a real date, so cells and PDFs can format it. */
export function reportDate(isoInstant: string): Date {
  const date = new Date(isoInstant)
  return Number.isNaN(date.getTime()) ? new Date() : date
}

export function reportDay(dateKey: string): Date {
  const date = parseDateKey(dateKey)
  return Number.isNaN(date.getTime()) ? new Date() : date
}

export function reportFileBase(filters: Filters): string {
  return `AquaSync Catastro – Reporte ${filters.desde} a ${filters.hasta}`
}

function findName(
  options: ReadonlyArray<{ id: string; nombre: string }>,
  id: string | undefined,
): string | undefined {
  if (!id) return undefined
  return options.find((option) => option.id === id)?.nombre
}

export function readableFilters(filters: Filters, catalogs: Catalogs): ReportFilterLine[] {
  const kpiPeriod = `${formatReportDate(reportDay(filters.desde))} a ${formatReportDate(
    reportDay(filters.hasta),
  )}`

  return [
    {
      label: 'Unidad de gestión',
      value: findName(catalogs.ugestiones, filters.ugestionId) ?? 'Todas',
    },
    {
      label: 'Sucursal',
      value: findName(catalogs.sucursales, filters.sucursalId) ?? 'Todas',
    },
    { label: 'Filial', value: filters.filial || 'Todas' },
    { label: 'Zona', value: filters.zona || 'Todas' },
    { label: 'Ruta', value: filters.ruta || 'Todas' },
    { label: 'Usuario', value: filters.usuario || 'Todos' },
    {
      label: 'Tipo de cambio',
      value: filters.tipoCambio ? CHANGE_TYPE_LABELS[filters.tipoCambio] : 'Todos',
    },
    { label: 'Período', value: kpiPeriod },
  ]
}

export function rowLimitWarning(total: number): string | null {
  if (total <= ROWS_WARNING_LIMIT) return null
  return `El detalle tiene ${formatNumber(total)} cambios (más de ${formatNumber(
    ROWS_WARNING_LIMIT,
  )}). Conviene acotar el período o los filtros.`
}

export function buildKpiRows(summary: Summary): ReportKpi[] {
  return KPI_CARDS.map((card) => {
    const raw = summary[card.key]
    const value = raw === null ? '—' : card.percent ? formatPercent(raw) : formatNumber(raw)

    return { key: card.key, label: card.label, value, raw, color: card.color }
  })
}

export function buildRouteRows(progress: UserRouteProgress[]): {
  rows: ReportRouteRow[]
  totals: ReportRouteTotals
} {
  const rows = progress.map((row) => ({
    usuario: row.usuario,
    filial: row.filial,
    zona: row.zona,
    ruta: row.ruta,
    cuentasRuta: row.cuentasRuta,
    cuentasTrabajadas: row.cuentasTrabajadas,
    fotos: row.fotos,
    ubicaciones: row.ubicaciones,
    avance: row.cuentasRuta > 0 ? row.cuentasTrabajadas / row.cuentasRuta : 0,
    ultimaActividad: row.ultimaActividad ? reportDate(row.ultimaActividad) : null,
  }))

  const cuentasTrabajadas = rows.reduce((acc, row) => acc + row.cuentasTrabajadas, 0)
  const cuentasRuta = rows.reduce((acc, row) => acc + row.cuentasRuta, 0)

  return {
    rows,
    totals: {
      cuentasTrabajadas,
      cuentasRuta,
      fotos: rows.reduce((acc, row) => acc + row.fotos, 0),
      ubicaciones: rows.reduce((acc, row) => acc + row.ubicaciones, 0),
      avance: cuentasRuta > 0 ? cuentasTrabajadas / cuentasRuta : 0,
    },
  }
}

export function buildChangeRows(changes: ChangeRow[]): ReportChangeRow[] {
  return changes.map((change) => ({
    fecha: reportDate(change.fecha),
    usuario: change.usuario,
    cuenta: change.cuenta,
    cliente: change.cliente,
    filial: change.filial,
    zona: change.zona,
    ruta: change.ruta,
    tipo: change.tipoCambio,
    tipoLabel: CHANGE_TYPE_LABELS[change.tipoCambio],
    tipoColor: CHANGE_TYPE_COLORS[change.tipoCambio],
    origen: change.origen,
  }))
}

export function buildDailyRows(daily: DailyProgress[]): ReportDailyRow[] {
  const byDay = new Map<string, ReportDailyRow>()

  for (const row of daily) {
    const current =
      byDay.get(row.fecha) ??
      ({
        fecha: reportDay(row.fecha),
        FotoNueva: 0,
        FotoActualizada: 0,
        UbicacionNueva: 0,
        UbicacionCorregida: 0,
        total: 0,
      } as ReportDailyRow)

    current[row.tipoCambio] += row.cambios
    current.total += row.cambios
    byDay.set(row.fecha, current)
  }

  return [...byDay.values()].sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
}

export interface BuildReportInput {
  filters: Filters
  catalogs: Catalogs
  summary: Summary
  progress: UserRouteProgress[]
  changes: ChangeRow[]
  daily: DailyProgress[]
  usuario: string
  generatedAt: Date
  environment: string
}

/** The whole report as plain data: Excel and PDF only add styling on top. */
export function buildReportContent(input: BuildReportInput): ReportContent {
  const { rows: routes, totals } = buildRouteRows(input.progress)

  return {
    meta: {
      title: REPORT_TITLE,
      usuario: input.usuario,
      generatedAt: input.generatedAt,
      environment: input.environment,
      fileBase: reportFileBase(input.filters),
    },
    period: {
      desde: input.filters.desde,
      hasta: input.filters.hasta,
      label: `${formatReportDate(reportDay(input.filters.desde))} a ${formatReportDate(
        reportDay(input.filters.hasta),
      )}`,
    },
    filters: readableFilters(input.filters, input.catalogs),
    kpis: buildKpiRows(input.summary),
    routes,
    routeTotals: totals,
    changes: buildChangeRows(input.changes),
    daily: buildDailyRows(input.daily),
  }
}

/** Column order shared by both report builders. */
export const REPORT_LAYOUT = {
  routeHeaders: ['Usuario', 'Filial', 'Zona', 'Ruta', 'Cuentas ruta', 'Trabajadas', 'Fotos', 'Ubicaciones', 'Avance', 'Última actividad'],
  changeHeaders: ['Fecha', 'Usuario', 'Cuenta', 'Cliente', 'Filial', 'Zona', 'Ruta', 'Tipo', 'Origen'],
  dailyHeaders: ['Fecha', ...CHANGE_TYPES.map((tipo) => CHANGE_TYPE_LABELS[tipo]), 'Total'],
} as const
