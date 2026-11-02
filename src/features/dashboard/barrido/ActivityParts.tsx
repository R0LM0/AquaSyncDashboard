import { useId, useMemo } from 'react'
import { FileSpreadsheet, FileText, type LucideIcon } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/button'
import type { ActividadDispositivo, ActividadPorDia } from '@/domain/types'
import { formatDateTime, formatDayKey, formatNumber } from '@/shared/format'
import { EmptyState } from '../EmptyState'
import { useReducedMotion } from '../useReducedMotion'
import { AXIS_PROPS, GRID_PROPS, chartAnimation } from '../charts/chartTheme'
import { aliasColor, stackByDay, type DayRow } from './activity'

/** Accent colours (theme tokens) a KPI card can use. */
export const KPI_ACCENTS = {
  primary: 'hsl(var(--primary))',
  success: 'hsl(var(--success))',
  warning: 'hsl(var(--warning))',
  danger: 'hsl(var(--danger))',
  info: '#2f8fd8',
  violet: '#8b6cf0',
} as const

/** KPI tile: accent icon chip, big tabular number, helper line and a soft accent glow. */
export function Kpi({
  label,
  value,
  color,
  icon: Icon,
  hint,
}: {
  label: string
  value: string
  color?: string
  icon?: LucideIcon
  hint?: string
}) {
  const accent = color ?? KPI_ACCENTS.primary
  return (
    <div
      className="group relative overflow-hidden rounded-xl border bg-surface-2/50 p-3.5 transition-shadow hover:shadow-panel"
      style={{ borderColor: `color-mix(in srgb, ${accent} 35%, transparent)` }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-10 size-24 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-40"
        style={{ background: accent }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-0.5"
        style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }}
      />
      <div className="relative flex items-start justify-between gap-2">
        <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-fg">{label}</dt>
        {Icon ? (
          <span
            className="grid size-8 shrink-0 place-items-center rounded-lg"
            style={{ background: `color-mix(in srgb, ${accent} 16%, transparent)`, color: accent }}
          >
            <Icon className="size-4" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <dd className="relative mt-1.5 text-3xl font-extrabold leading-none tabular-nums text-fg">{value}</dd>
      {hint ? <p className="relative mt-1.5 text-xs text-muted-fg">{hint}</p> : null}
    </div>
  )
}

export function Th({ children, numeric }: { children: React.ReactNode; numeric?: boolean }) {
  return (
    <th
      scope="col"
      className={`border-b border-border-subtle px-2 py-2 whitespace-nowrap ${numeric ? 'text-right' : ''}`}
    >
      {children}
    </th>
  )
}

export const TD = 'border-b border-border-subtle px-2 py-2 text-xs'
export const THEAD = 'sticky top-0 bg-surface'
export const THEAD_ROW = 'text-left text-[10px] font-bold uppercase tracking-[0.08em] text-muted-fg'

/** Hover card of the day chart: the date, one line per device with its colour, and the day total. */
export function DayTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean
  label?: string | number
  payload?: ReadonlyArray<{ name?: string | number; value?: number | string; color?: string }>
}) {
  if (!active || !payload || payload.length === 0) return null
  const lines = payload.filter((item) => Number(item.value) > 0)
  const total = lines.reduce((sum, item) => sum + Number(item.value), 0)

  return (
    <div
      className="min-w-40 rounded-xl border border-border-subtle bg-surface px-3 py-2 text-xs shadow-panel"
      data-testid="day-tooltip"
    >
      <p className="mb-1.5 font-bold text-muted-fg">{formatDayKey(String(label))}</p>
      <ul className="space-y-1">
        {lines.map((item) => (
          <li key={String(item.name)} className="flex items-center justify-between gap-4 text-fg">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ background: item.color }} aria-hidden="true" />
              {item.name}
            </span>
            <span className="font-semibold tabular-nums">{formatNumber(Number(item.value))}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1.5 flex justify-between gap-4 border-t border-border-subtle pt-1.5 font-bold text-fg">
        <span>Total</span>
        <span className="tabular-nums">{formatNumber(total)}</span>
      </p>
    </div>
  )
}

/** Screen-reader summary: the period, the total and the busiest day. */
export function daySummary(rows: DayRow[], aliases: string[]): string {
  const totals = rows.map((row) => ({
    fecha: row.fecha,
    total: aliases.reduce((sum, alias) => sum + Number(row[alias] ?? 0), 0),
  }))
  const all = totals.reduce((sum, day) => sum + day.total, 0)
  const peak = totals.reduce((best, day) => (day.total > best.total ? day : best), totals[0])
  const first = formatDayKey(rows[0].fecha)
  const last = formatDayKey(rows[rows.length - 1].fecha)
  return (
    `Actividad por día de ${aliases.length} dispositivo${aliases.length === 1 ? '' : 's'}, del ${first} al ${last}: ` +
    `${formatNumber(all)} en total; el día más activo fue el ${formatDayKey(peak.fecha)} con ${formatNumber(peak.total)}`
  )
}

/** Activity per day: a smooth area stacked by device, each with its own colour and a soft gradient. */
export function DayChart({ porDia, order, emptyTitle }: { porDia: ActividadPorDia[]; order: string[]; emptyTitle: string }) {
  const reduced = useReducedMotion()
  const { rows, aliases } = useMemo(() => stackByDay(porDia), [porDia])
  const gradientId = useId().replace(/:/g, '')

  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} detail="Probá con otro rango de fechas o menos filtros." />
  }

  return (
    <div role="img" aria-label={daySummary(rows, aliases)} data-testid="day-chart">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={rows} margin={{ top: 10, right: 12, bottom: 0, left: -12 }}>
          <defs>
            {aliases.map((alias, index) => (
              <linearGradient key={alias} id={`${gradientId}-${index}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={aliasColor(alias, order)} stopOpacity={0.55} />
                <stop offset="100%" stopColor={aliasColor(alias, order)} stopOpacity={0.04} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid {...GRID_PROPS} strokeOpacity={0.6} />
          <XAxis dataKey="fecha" {...AXIS_PROPS} tickFormatter={(value: string) => formatDayKey(value).slice(0, 5)} minTickGap={18} />
          <YAxis {...AXIS_PROPS} allowDecimals={false} width={44} />
          <Tooltip content={<DayTooltip />} cursor={{ stroke: 'hsl(var(--muted-fg))', strokeDasharray: '3 3' }} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
          {aliases.map((alias, index) => (
            <Area
              key={alias}
              type="monotone"
              dataKey={alias}
              name={alias}
              stackId="dia"
              stroke={aliasColor(alias, order)}
              strokeWidth={2}
              fill={`url(#${gradientId}-${index})`}
              activeDot={{ r: 4, strokeWidth: 2, stroke: 'hsl(var(--surface))' }}
              {...chartAnimation(reduced)}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/** The phones that registered activity: who, which, how many and when. */
export function DeviceTable({
  devices,
  countLabel,
  order,
}: {
  devices: ActividadDispositivo[]
  countLabel: string
  order: string[]
}) {
  if (devices.length === 0) {
    return <EmptyState title="Ningún dispositivo registró actividad" detail="Aparecerán cuando un celular envíe datos en el período." />
  }

  return (
    <div className="max-h-[320px] overflow-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">Dispositivos con actividad</caption>
        <thead className={THEAD}>
          <tr className={THEAD_ROW}>
            <Th>Usuario</Th>
            <Th>Alias</Th>
            <Th>Modelo</Th>
            <Th>Versión</Th>
            <Th numeric>{countLabel}</Th>
            <Th>Primera</Th>
            <Th>Última</Th>
          </tr>
        </thead>
        <tbody>
          {devices.map((device) => (
            <tr key={`${device.usuario}-${device.dispositivoId}`}>
              <td className={`${TD} font-semibold text-fg`}>{device.usuario}</td>
              <td className={TD}>
                <span className="inline-flex items-center gap-1.5 font-semibold text-fg">
                  <span className="size-2.5 rounded-full" style={{ background: aliasColor(device.alias, order) }} aria-hidden="true" />
                  {device.alias}
                </span>
              </td>
              <td className={TD}>{device.modelo || '—'}</td>
              <td className={TD}>{device.appVersion || '—'}</td>
              <td className={`${TD} text-right tabular-nums`}>{formatNumber(device.cantidad)}</td>
              <td className={`${TD} text-muted-fg`}>{device.primera ? formatDateTime(device.primera) : '—'}</td>
              <td className={`${TD} text-muted-fg`}>{device.ultima ? formatDateTime(device.ultima) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ExportButtons({
  busy,
  disabled,
  onExport,
}: {
  busy: 'excel' | 'pdf' | null
  disabled?: boolean
  onExport: (kind: 'excel' | 'pdf') => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => onExport('excel')} disabled={busy !== null || disabled}>
        <FileSpreadsheet aria-hidden="true" />
        {busy === 'excel' ? 'Generando…' : 'Excel'}
      </Button>
      <Button variant="outline" size="sm" onClick={() => onExport('pdf')} disabled={busy !== null || disabled}>
        <FileText aria-hidden="true" />
        {busy === 'pdf' ? 'Generando…' : 'PDF'}
      </Button>
    </div>
  )
}
