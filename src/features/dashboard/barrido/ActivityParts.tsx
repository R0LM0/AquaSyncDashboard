import { useMemo } from 'react'
import { FileSpreadsheet, FileText } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/button'
import type { ActividadDispositivo, ActividadPorDia } from '@/domain/types'
import { formatDateTime, formatDayKey, formatNumber } from '@/shared/format'
import { EmptyState } from '../EmptyState'
import { useReducedMotion } from '../useReducedMotion'
import { AXIS_PROPS, GRID_PROPS, TOOLTIP_PROPS, chartAnimation } from '../charts/chartTheme'
import { aliasColor, stackByDay } from './activity'

export function Kpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-2/50 p-3">
      <dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-fg">{label}</dt>
      <dd className="mt-1 text-2xl font-extrabold tabular-nums text-fg" style={color ? { color } : undefined}>
        {value}
      </dd>
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

/** Activity per day, stacked by device alias. */
export function DayChart({ porDia, order, emptyTitle }: { porDia: ActividadPorDia[]; order: string[]; emptyTitle: string }) {
  const reduced = useReducedMotion()
  const { rows, aliases } = useMemo(() => stackByDay(porDia), [porDia])

  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} detail="Probá con otro rango de fechas o menos filtros." />
  }

  return (
    <div role="img" aria-label={`Actividad por día de ${aliases.length} dispositivo${aliases.length === 1 ? '' : 's'}`}>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={rows} margin={{ top: 8, right: 10, bottom: 0, left: -12 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="fecha" {...AXIS_PROPS} tickFormatter={(value: string) => formatDayKey(value).slice(0, 5)} minTickGap={18} />
          <YAxis {...AXIS_PROPS} allowDecimals={false} width={44} />
          <Tooltip {...TOOLTIP_PROPS} labelFormatter={(value) => formatDayKey(String(value))} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
          {aliases.map((alias) => (
            <Bar key={alias} dataKey={alias} stackId="dia" fill={aliasColor(alias, order)} {...chartAnimation(reduced)} />
          ))}
        </BarChart>
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
