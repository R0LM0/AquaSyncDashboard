import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Camera,
  ImageUp,
  MapPin,
  Minus,
  Percent,
  Users,
} from 'lucide-react'
import { CHANGE_TYPE_COLORS } from '@/domain/labels'
import type { DailyProgress, Summary } from '@/domain/types'
import { formatNumber, formatPercent } from '@/shared/format'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { kpiDelta } from '../deltas'
import { CountUp } from './CountUp'
import { Sparkline } from './Sparkline'
import { sparklineSeries, type SparkKey } from './sparklineSeries'

interface KpiDefinition {
  key: keyof Summary
  label: string
  hint: string
  icon: typeof Users
  color: string
  sparkKey?: SparkKey
  percent?: boolean
}

const CARDS: readonly KpiDefinition[] = [
  {
    key: 'cuentasTrabajadas',
    label: 'Cuentas trabajadas',
    hint: 'Predios atendidos en el período',
    icon: Building2,
    color: CHANGE_TYPE_COLORS.FotoNueva,
    sparkKey: 'cuentasTrabajadas',
  },
  {
    key: 'fotosNuevas',
    label: 'Fotos nuevas',
    hint: 'Primera evidencia fotográfica',
    icon: Camera,
    color: CHANGE_TYPE_COLORS.FotoNueva,
    sparkKey: 'fotosNuevas',
  },
  {
    key: 'fotosActualizadas',
    label: 'Fotos actualizadas',
    hint: 'Reemplazo de una foto existente',
    icon: ImageUp,
    color: CHANGE_TYPE_COLORS.FotoActualizada,
    sparkKey: 'fotosActualizadas',
  },
  {
    key: 'ubicaciones',
    label: 'Ubicaciones',
    hint: 'Nuevas y corregidas',
    icon: MapPin,
    color: CHANGE_TYPE_COLORS.UbicacionNueva,
    sparkKey: 'ubicaciones',
  },
  {
    key: 'usuariosActivos',
    label: 'Usuarios activos',
    hint: 'Personal de campo con actividad',
    icon: Users,
    color: CHANGE_TYPE_COLORS.UbicacionCorregida,
    sparkKey: 'usuariosActivos',
  },
  {
    key: 'avanceRutaPct',
    label: 'Avance de ruta',
    hint: 'Cuentas trabajadas sobre el total',
    icon: Percent,
    color: CHANGE_TYPE_COLORS.UbicacionCorregida,
    percent: true,
  },
]

export interface KpiCardsProps {
  summary: Summary
  previous?: Summary
  daily?: DailyProgress[]
  loading?: boolean
}

export function KpiCards({ summary, previous, daily = [], loading }: KpiCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3" data-testid="kpi-skeleton">
        {CARDS.map((card) => (
          <Card key={card.key} className="space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-7 w-full" />
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3">
      {CARDS.map((card) => {
        const value = summary[card.key]
        const Icon = card.icon
        const delta = kpiDelta(card.key, summary, previous)
        const series = card.sparkKey ? sparklineSeries(daily, card.sparkKey) : []

        return (
          <Card key={card.key} className="group relative overflow-hidden">
            <div
              aria-hidden="true"
              className="absolute -right-8 -top-10 size-24 rounded-full opacity-15 blur-2xl transition-opacity group-hover:opacity-30"
              style={{ background: card.color }}
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-fg">{card.label}</p>
              <span
                className="grid size-7 place-items-center rounded-lg"
                style={{ background: `${card.color}1f`, color: card.color }}
              >
                <Icon className="size-3.5" aria-hidden="true" />
              </span>
            </div>

            <p className="mt-2 text-3xl font-extrabold tracking-tight text-fg" data-testid={`kpi-${card.key}`}>
              {value === null ? (
                '—'
              ) : card.percent ? (
                formatPercent(value)
              ) : (
                <CountUp value={value} format={formatNumber} />
              )}
            </p>

            <div className="mt-2 flex items-end justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[11px] text-muted-fg">{card.hint}</p>
                <DeltaBadge value={delta.value} direction={delta.direction} />
              </div>
              {series.length > 1 ? (
                <Sparkline
                  points={series}
                  color={card.color}
                  label={`Tendencia de ${card.label.toLowerCase()}`}
                />
              ) : null}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

function DeltaBadge({ value, direction }: { value: number | null; direction: 'up' | 'down' | 'flat' }) {
  if (value === null) {
    return <p className="mt-1 text-[11px] text-muted-fg/80">Sin período anterior comparable</p>
  }

  const Icon = direction === 'up' ? ArrowUpRight : direction === 'down' ? ArrowDownRight : Minus
  const tone =
    direction === 'up'
      ? 'text-success'
      : direction === 'down'
        ? 'text-danger'
        : 'text-muted-fg'

  return (
    <p className={cn('mt-1 inline-flex items-center gap-1 text-[11px] font-semibold', tone)}>
      <Icon className="size-3.5" aria-hidden="true" />
      {value > 0 ? '+' : ''}
      {value} % vs. período anterior
    </p>
  )
}
